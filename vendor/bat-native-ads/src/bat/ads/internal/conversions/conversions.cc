/* Copyright (c) 2019 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "bat/ads/internal/conversions/conversions.h"

#include <algorithm>
#include <cstdint>
#include <set>

#include "base/check.h"
#include "base/time/time.h"
#include "bat/ads/ads.h"
#include "bat/ads/ads_client.h"
#include "bat/ads/internal/account/account_util.h"
#include "bat/ads/internal/ad_events/ad_event_info.h"
#include "bat/ads/internal/ad_events/ad_events.h"
#include "bat/ads/internal/ads_client_helper.h"
#include "bat/ads/internal/conversions/conversion_queue_item_info.h"
#include "bat/ads/internal/conversions/sorts/conversions_sort.h"
#include "bat/ads/internal/conversions/sorts/conversions_sort_factory.h"
#include "bat/ads/internal/conversions/verifiable_conversion_info.h"
#include "bat/ads/internal/database/tables/ad_events_database_table.h"
#include "bat/ads/internal/database/tables/conversion_queue_database_table.h"
#include "bat/ads/internal/database/tables/conversions_database_table.h"
#include "bat/ads/internal/features/conversions/conversions_features.h"
#include "bat/ads/internal/logging.h"
#include "bat/ads/internal/time_formatting_util.h"
#include "bat/ads/internal/url_util.h"
#include "bat/ads/pref_names.h"
#include "brave_base/random.h"
#include "third_party/re2/src/re2/re2.h"

namespace ads {

namespace {

const int64_t kConvertAfterSeconds =
    base::Time::kHoursPerDay * base::Time::kSecondsPerHour;
const int64_t kDebugConvertAfterSeconds = 10 * base::Time::kSecondsPerMinute;
const int64_t kExpiredConvertAfterSeconds = 1 * base::Time::kSecondsPerMinute;
const char kSearchInUrl[] = "url";

bool HasObservationWindowForAdEventExpired(const int observation_window,
                                           const AdEventInfo& ad_event) {
  const base::Time time = base::Time::Now() - base::Days(observation_window);

  if (time < ad_event.created_at) {
    return false;
  }

  return true;
}

bool ShouldConvertAdEvent(const AdEventInfo& ad_event) {
  if (ad_event.type == AdType::kInlineContentAd) {
    if (ad_event.confirmation_type == ConfirmationType::kViewed) {
      // Do not convert views for inline content ads
      return false;
    }

    return true;
  }

  if (!ShouldRewardUser()) {
    // Do not convert if the user has not joined rewards for all other ad types
    return false;
  }

  return true;
}

bool DoesConfirmationTypeMatchConversionType(
    const ConfirmationType& confirmation_type,
    const std::string& conversion_type) {
  switch (confirmation_type.value()) {
    case ConfirmationType::kViewed: {
      if (conversion_type == "postview") {
        return true;
      }

      return false;
    }

    case ConfirmationType::kClicked: {
      if (conversion_type == "postclick") {
        return true;
      }

      return false;
    }

    case ConfirmationType::kUndefined:
    case ConfirmationType::kServed:
    case ConfirmationType::kDismissed:
    case ConfirmationType::kTransferred:
    case ConfirmationType::kSaved:
    case ConfirmationType::kFlagged:
    case ConfirmationType::kUpvoted:
    case ConfirmationType::kDownvoted:
    case ConfirmationType::kConversion: {
      return false;
    }
  }
}

std::string ExtractConversionIdFromText(
    const std::string& html,
    const std::vector<std::string>& redirect_chain,
    const std::string& conversion_url_pattern,
    const ConversionIdPatternMap& conversion_id_patterns) {
  std::string conversion_id;
  std::string conversion_id_pattern = features::GetDefaultConversionIdPattern();
  std::string text = html;

  const auto iter = conversion_id_patterns.find(conversion_url_pattern);
  if (iter != conversion_id_patterns.end()) {
    const ConversionIdPatternInfo conversion_id_pattern_info = iter->second;
    if (conversion_id_pattern_info.search_in == kSearchInUrl) {
      const auto url_iter = std::find_if(
          redirect_chain.cbegin(), redirect_chain.cend(),
          [=](const std::string& url) {
            return DoesUrlMatchPattern(url, conversion_url_pattern);
          });

      if (url_iter == redirect_chain.end()) {
        return conversion_id;
      }

      text = *url_iter;
    }

    conversion_id_pattern = conversion_id_pattern_info.id_pattern;
  }

  re2::StringPiece text_string_piece(text);
  RE2 r(conversion_id_pattern);
  RE2::FindAndConsume(&text_string_piece, r, &conversion_id);

  return conversion_id;
}

std::set<std::string> GetConvertedCreativeSets(const AdEventList& ad_events) {
  std::set<std::string> creative_set_ids;
  for (const auto& ad_event : ad_events) {
    if (ad_event.confirmation_type != ConfirmationType::kConversion) {
      continue;
    }

    if (creative_set_ids.find(ad_event.creative_set_id) !=
        creative_set_ids.end()) {
      continue;
    }

    creative_set_ids.insert(ad_event.creative_set_id);
  }

  return creative_set_ids;
}

AdEventList FilterAdEventsForConversion(const AdEventList& ad_events,
                                        const ConversionInfo& conversion) {
  AdEventList filtered_ad_events;

  std::copy_if(
      ad_events.cbegin(), ad_events.cend(),
      std::back_inserter(filtered_ad_events),
      [&conversion](const AdEventInfo& ad_event) {
        if (ad_event.creative_set_id != conversion.creative_set_id) {
          return false;
        }

        if (!ShouldConvertAdEvent(ad_event)) {
          return false;
        }

        if (!DoesConfirmationTypeMatchConversionType(ad_event.confirmation_type,
                                                     conversion.type)) {
          return false;
        }

        if (HasObservationWindowForAdEventExpired(conversion.observation_window,
                                                  ad_event)) {
          return false;
        }

        return true;
      });

  return filtered_ad_events;
}

}  // namespace

Conversions::Conversions() = default;

Conversions::~Conversions() = default;

void Conversions::AddObserver(ConversionsObserver* observer) {
  DCHECK(observer);
  observers_.AddObserver(observer);
}

void Conversions::RemoveObserver(ConversionsObserver* observer) {
  DCHECK(observer);
  observers_.RemoveObserver(observer);
}

void Conversions::MaybeConvert(
    const std::vector<std::string>& redirect_chain,
    const std::string& html,
    const ConversionIdPatternMap& conversion_id_patterns) {
  if (!ShouldAllow()) {
    BLOG(1, "Conversions are not allowed");
    return;
  }

  const std::string& url = redirect_chain.back();
  if (!DoesUrlHaveSchemeHTTPOrHTTPS(url)) {
    BLOG(1, "URL is not supported for conversions");
    return;
  }

  CheckRedirectChain(redirect_chain, html, conversion_id_patterns);
}

void Conversions::StartTimerIfReady() {
  database::table::ConversionQueue database_table;
  database_table.GetAll(
      [=](const bool success,
          const ConversionQueueItemList& conversion_queue_items) {
        if (!success) {
          BLOG(1, "Failed to get conversion queue");
          return;
        }

        if (conversion_queue_items.empty()) {
          BLOG(1, "Conversion queue is empty");
          return;
        }

        ConversionQueueItemInfo conversion_queue_item =
            conversion_queue_items.front();

        StartTimer(conversion_queue_item);
      });
}

///////////////////////////////////////////////////////////////////////////////

bool Conversions::ShouldAllow() const {
  return AdsClientHelper::Get()->GetBooleanPref(
      prefs::kShouldAllowConversionTracking);
}

void Conversions::CheckRedirectChain(
    const std::vector<std::string>& redirect_chain,
    const std::string& html,
    const ConversionIdPatternMap& conversion_id_patterns) {
  BLOG(1, "Checking URL for conversions");

  database::table::AdEvents ad_events_database_table;
  ad_events_database_table.GetAll([=](const bool success,
                                      const AdEventList& ad_events) {
    if (!success) {
      BLOG(1, "Failed to get ad events");
      return;
    }

    database::table::Conversions conversions_database_table;
    conversions_database_table.GetAll([=](const bool success,
                                          const ConversionList& conversions) {
      if (!success) {
        BLOG(1, "Failed to get conversions");
        return;
      }

      if (conversions.empty()) {
        BLOG(1, "No conversions found for visited URL");
        return;
      }

      // Filter conversions by url pattern
      ConversionList filtered_conversions =
          FilterConversions(redirect_chain, conversions);

      // Sort conversions in descending order
      filtered_conversions = SortConversions(filtered_conversions);

      // Create list of creative set ids for already converted ads
      std::set<std::string> creative_set_ids =
          GetConvertedCreativeSets(ad_events);

      bool converted = false;

      // Check for conversions
      for (const auto& conversion : filtered_conversions) {
        const AdEventList& filtered_ad_events =
            FilterAdEventsForConversion(ad_events, conversion);

        for (const auto& ad_event : filtered_ad_events) {
          if (creative_set_ids.find(conversion.creative_set_id) !=
              creative_set_ids.end()) {
            // Creative set id has already been converted
            continue;
          }

          creative_set_ids.insert(ad_event.creative_set_id);

          VerifiableConversionInfo verifiable_conversion;
          verifiable_conversion.id = ExtractConversionIdFromText(
              html, redirect_chain, conversion.url_pattern,
              conversion_id_patterns);
          verifiable_conversion.public_key = conversion.advertiser_public_key;

          Convert(ad_event, verifiable_conversion);

          converted = true;
        }
      }

      if (!converted) {
        BLOG(1, "No conversions found for visited URL");
      }
    });
  });
}

void Conversions::Convert(
    const AdEventInfo& ad_event,
    const VerifiableConversionInfo& verifiable_conversion) {
  const std::string& campaign_id = ad_event.campaign_id;
  const std::string& creative_set_id = ad_event.creative_set_id;
  const std::string& creative_instance_id = ad_event.creative_instance_id;
  const std::string& advertiser_id = ad_event.advertiser_id;

  const base::Time& time = base::Time::Now();
  const std::string& friendly_date_and_time = LongFriendlyDateAndTime(time);

  BLOG(1, "Conversion for campaign id "
              << campaign_id << ", creative set id " << creative_set_id
              << ", creative instance id " << creative_instance_id
              << " and advertiser id " << advertiser_id << " "
              << friendly_date_and_time);

  AddItemToQueue(ad_event, verifiable_conversion);
}

ConversionList Conversions::FilterConversions(
    const std::vector<std::string>& redirect_chain,
    const ConversionList& conversions) {
  ConversionList filtered_conversions;

  std::copy_if(
      conversions.cbegin(), conversions.cend(),
      std::back_inserter(filtered_conversions),
      [&redirect_chain](const ConversionInfo& conversion) {
        const auto iter = std::find_if(
            redirect_chain.begin(), redirect_chain.end(),
            [&conversion](const std::string& url) {
              return DoesUrlMatchPattern(url, conversion.url_pattern);
            });

        if (iter == redirect_chain.end()) {
          return false;
        }

        return true;
      });

  return filtered_conversions;
}

ConversionList Conversions::SortConversions(const ConversionList& conversions) {
  const auto sort =
      ConversionsSortFactory::Build(ConversionSortType::kDescendingOrder);
  DCHECK(sort);

  return sort->Apply(conversions);
}

void Conversions::AddItemToQueue(
    const AdEventInfo& ad_event,
    const VerifiableConversionInfo& verifiable_conversion) {
  AdEventInfo conversion_ad_event = ad_event;
  conversion_ad_event.created_at = base::Time::Now();
  conversion_ad_event.confirmation_type = ConfirmationType::kConversion;

  LogAdEvent(conversion_ad_event, [](const bool success) {
    if (!success) {
      BLOG(1, "Failed to log conversion event");
      return;
    }

    BLOG(6, "Successfully logged conversion event");
  });

  ConversionQueueItemInfo conversion_queue_item;
  conversion_queue_item.campaign_id = ad_event.campaign_id;
  conversion_queue_item.creative_set_id = ad_event.creative_set_id;
  conversion_queue_item.creative_instance_id = ad_event.creative_instance_id;
  conversion_queue_item.advertiser_id = ad_event.advertiser_id;
  conversion_queue_item.conversion_id = verifiable_conversion.id;
  conversion_queue_item.advertiser_public_key =
      verifiable_conversion.public_key;
  conversion_queue_item.ad_type = ad_event.type;
  const int64_t rand_delay = static_cast<int64_t>(brave_base::random::Geometric(
      g_is_debug ? kDebugConvertAfterSeconds : kConvertAfterSeconds));
  conversion_queue_item.confirm_at =
      base::Time::Now() + base::Seconds(rand_delay);

  database::table::ConversionQueue database_table;
  database_table.Save({conversion_queue_item}, [=](const bool success) {
    if (!success) {
      BLOG(0, "Failed to append conversion to queue");
      return;
    }

    BLOG(3, "Successfully appended conversion to queue");

    StartTimerIfReady();
  });
}

bool Conversions::RemoveItemFromQueue(
    const ConversionQueueItemInfo& conversion_queue_item) {
  database::table::ConversionQueue database_table;
  database_table.Delete(conversion_queue_item, [=](const bool success) {
    if (!success) {
      BLOG(0, "Failed to remove conversion from queue");
      return;
    }

    BLOG(3, "Successfully removed conversion from queue");

    StartTimerIfReady();
  });

  return true;
}

void Conversions::ProcessQueueItem(
    const ConversionQueueItemInfo& conversion_queue_item) {
  const std::string& campaign_id = conversion_queue_item.campaign_id;
  const std::string& creative_set_id = conversion_queue_item.creative_set_id;
  const std::string& creative_instance_id =
      conversion_queue_item.creative_instance_id;
  const std::string& advertiser_id = conversion_queue_item.advertiser_id;
  const std::string& friendly_date_and_time =
      LongFriendlyDateAndTime(conversion_queue_item.confirm_at);

  if (!conversion_queue_item.IsValid()) {
    BLOG(1, "Failed to convert ad with campaign id "
                << campaign_id << ", creative set id " << creative_set_id
                << ", creative instance id " << creative_instance_id
                << " and advertiser id " << advertiser_id << " "
                << friendly_date_and_time);

    NotifyConversionFailed(conversion_queue_item);
  } else {
    BLOG(1, "Successfully converted ad with campaign id "
                << campaign_id << ", creative set id " << creative_set_id
                << ", creative instance id " << creative_instance_id
                << " and advertiser id " << advertiser_id << " "
                << friendly_date_and_time);

    NotifyConversion(conversion_queue_item);
  }

  RemoveItemFromQueue(conversion_queue_item);
}

void Conversions::ProcessQueue() {
  database::table::ConversionQueue database_table;
  database_table.GetAll(
      [=](const bool success,
          const ConversionQueueItemList& conversion_queue_items) {
        if (!success) {
          BLOG(1, "Failed to get conversion queue");
          return;
        }

        if (conversion_queue_items.empty()) {
          BLOG(1, "Conversion queue is empty");
          return;
        }

        ConversionQueueItemInfo conversion_queue_item =
            conversion_queue_items.front();

        ProcessQueueItem(conversion_queue_item);
      });
}

void Conversions::StartTimer(
    const ConversionQueueItemInfo& conversion_queue_item) {
  const base::Time now = base::Time::Now();

  base::TimeDelta delay;

  if (now < conversion_queue_item.confirm_at) {
    delay = conversion_queue_item.confirm_at - now;
  } else {
    const int64_t rand_delay = static_cast<int64_t>(
        brave_base::random::Geometric(kExpiredConvertAfterSeconds));
    delay = base::Seconds(rand_delay);
  }

  const base::Time time = timer_.Start(
      delay,
      base::BindOnce(&Conversions::ProcessQueue, base::Unretained(this)));

  const std::string& campaign_id = conversion_queue_item.campaign_id;
  const std::string& creative_set_id = conversion_queue_item.creative_set_id;
  const std::string& creative_instance_id =
      conversion_queue_item.creative_instance_id;
  const std::string& advertiser_id = conversion_queue_item.advertiser_id;
  const std::string& friendly_date_and_time = FriendlyDateAndTime(time);

  BLOG(1, "Convert campaign id "
              << campaign_id << ", creative set id " << creative_set_id
              << ", creative instance id " << creative_instance_id
              << " and advertiser id " << advertiser_id << " "
              << friendly_date_and_time);
}

void Conversions::NotifyConversion(
    const ConversionQueueItemInfo& conversion_queue_item) const {
  for (ConversionsObserver& observer : observers_) {
    observer.OnConversion(conversion_queue_item);
  }
}

void Conversions::NotifyConversionFailed(
    const ConversionQueueItemInfo& conversion_queue_item) const {
  for (ConversionsObserver& observer : observers_) {
    observer.OnConversionFailed(conversion_queue_item);
  }
}

}  // namespace ads
