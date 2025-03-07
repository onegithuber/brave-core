/* Copyright (c) 2019 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "bat/ads/internal/frequency_capping/permission_rules/ads_per_day_frequency_cap.h"

#include "base/time/time.h"
#include "bat/ads/internal/ad_events/ad_events.h"
#include "bat/ads/internal/features/ad_serving/ad_serving_features.h"
#include "bat/ads/internal/frequency_capping/frequency_capping_util.h"

namespace ads {

AdsPerDayFrequencyCap::AdsPerDayFrequencyCap() = default;

AdsPerDayFrequencyCap::~AdsPerDayFrequencyCap() = default;

bool AdsPerDayFrequencyCap::ShouldAllow() {
  const std::deque<base::Time> history =
      GetAdEvents(AdType::kAdNotification, ConfirmationType::kServed);

  if (!DoesRespectCap(history)) {
    last_message_ = "You have exceeded the allowed ads per day";
    return false;
  }

  return true;
}

std::string AdsPerDayFrequencyCap::GetLastMessage() const {
  return last_message_;
}

bool AdsPerDayFrequencyCap::DoesRespectCap(
    const std::deque<base::Time>& history) {
  const base::TimeDelta time_constraint =
      base::Seconds(base::Time::kSecondsPerHour * base::Time::kHoursPerDay);

  const int cap = features::GetMaximumAdNotificationsPerDay();

  return DoesHistoryRespectCapForRollingTimeConstraint(history, time_constraint,
                                                       cap);
}

}  // namespace ads
