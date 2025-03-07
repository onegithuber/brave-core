/* Copyright (c) 2020 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "bat/ads/internal/account/confirmations/confirmations.h"

#include <cstdint>
#include <vector>

#include "base/check_op.h"
#include "base/guid.h"
#include "base/json/json_writer.h"
#include "base/time/time.h"
#include "base/values.h"
#include "bat/ads/ad_type.h"
#include "bat/ads/ads_client.h"
#include "bat/ads/confirmation_type.h"
#include "bat/ads/internal/account/account_util.h"
#include "bat/ads/internal/account/confirmations/confirmations_state.h"
#include "bat/ads/internal/ads_client_helper.h"
#include "bat/ads/internal/logging.h"
#include "bat/ads/internal/privacy/privacy_util.h"
#include "bat/ads/internal/privacy/tokens/token_generator_interface.h"
#include "bat/ads/internal/privacy/unblinded_payment_tokens/unblinded_payment_token_info.h"
#include "bat/ads/internal/privacy/unblinded_payment_tokens/unblinded_payment_tokens.h"
#include "bat/ads/internal/privacy/unblinded_tokens/unblinded_token_info.h"
#include "bat/ads/internal/privacy/unblinded_tokens/unblinded_tokens.h"
#include "bat/ads/internal/time_formatting_util.h"
#include "bat/ads/internal/tokens/redeem_unblinded_token/create_confirmation_util.h"
#include "bat/ads/internal/tokens/redeem_unblinded_token/redeem_unblinded_token.h"
#include "bat/ads/internal/tokens/redeem_unblinded_token/user_data/confirmation_dto_user_data_builder.h"
#include "bat/ads/pref_names.h"
#include "bat/ads/transaction_info.h"

namespace ads {

namespace {
const int64_t kRetryAfterSeconds = 15;
}  // namespace

Confirmations::Confirmations(privacy::TokenGeneratorInterface* token_generator)
    : token_generator_(token_generator),
      redeem_unblinded_token_(std::make_unique<RedeemUnblindedToken>()) {
  DCHECK(token_generator_);

  redeem_unblinded_token_->set_delegate(this);
}

Confirmations::~Confirmations() = default;

void Confirmations::AddObserver(ConfirmationsObserver* observer) {
  DCHECK(observer);
  observers_.AddObserver(observer);
}

void Confirmations::RemoveObserver(ConfirmationsObserver* observer) {
  DCHECK(observer);
  observers_.RemoveObserver(observer);
}

void Confirmations::Confirm(const TransactionInfo& transaction) {
  DCHECK(transaction.IsValid());

  BLOG(1, "Confirming " << std::string(transaction.confirmation_type) << " for "
                        << std::string(transaction.ad_type)
                        << " with transaction id " << transaction.id
                        << " and creative instance id "
                        << transaction.creative_instance_id);

  dto::user_data::Build(
      transaction.creative_instance_id, transaction.confirmation_type,
      [=](const base::Value& user_data) {
        const base::DictionaryValue* user_data_dictionary = nullptr;
        user_data.GetAsDictionary(&user_data_dictionary);

        const ConfirmationInfo& confirmation =
            CreateConfirmation(transaction.id, transaction.creative_instance_id,
                               transaction.confirmation_type,
                               transaction.ad_type, *user_data_dictionary);

        redeem_unblinded_token_->Redeem(confirmation);
      });
}

void Confirmations::ProcessRetryQueue() {
  if (retry_timer_.IsRunning()) {
    return;
  }

  Retry();
}

///////////////////////////////////////////////////////////////////////////////

void Confirmations::Retry() {
  const ConfirmationList& failed_confirmations =
      ConfirmationsState::Get()->GetFailedConfirmations();
  if (failed_confirmations.empty()) {
    BLOG(1, "No failed confirmations to retry");
    return;
  }

  DCHECK(!retry_timer_.IsRunning());
  const base::Time& time = retry_timer_.StartWithPrivacy(
      base::Seconds(kRetryAfterSeconds),
      base::BindOnce(&Confirmations::OnRetry, base::Unretained(this)));

  BLOG(1, "Retry sending failed confirmations " << FriendlyDateAndTime(time));
}

void Confirmations::OnRetry() {
  const ConfirmationList& failed_confirmations =
      ConfirmationsState::Get()->GetFailedConfirmations();
  DCHECK(!failed_confirmations.empty());

  const ConfirmationInfo& confirmation = failed_confirmations.front();

  RemoveFromRetryQueue(confirmation);

  redeem_unblinded_token_->Redeem(confirmation);
}

void Confirmations::StopRetrying() {
  retry_timer_.Stop();
}

ConfirmationInfo Confirmations::CreateConfirmation(
    const std::string& transaction_id,
    const std::string& creative_instance_id,
    const ConfirmationType& confirmation_type,
    const AdType& ad_type,
    const base::DictionaryValue& user_data) const {
  DCHECK(!transaction_id.empty());
  DCHECK(!creative_instance_id.empty());
  DCHECK_NE(ConfirmationType::kUndefined, confirmation_type.value());
  DCHECK_NE(AdType::kUndefined, ad_type.value());

  ConfirmationInfo confirmation;

  confirmation.id = base::GenerateGUID();
  confirmation.transaction_id = transaction_id;
  confirmation.creative_instance_id = creative_instance_id;
  confirmation.type = confirmation_type;
  confirmation.ad_type = ad_type;
  confirmation.created_at = base::Time::Now();

  if (ShouldRewardUser() &&
      !ConfirmationsState::Get()->get_unblinded_tokens()->IsEmpty()) {
    const privacy::UnblindedTokenInfo& unblinded_token =
        ConfirmationsState::Get()->get_unblinded_tokens()->GetToken();

    confirmation.unblinded_token = unblinded_token;

    const std::vector<Token>& tokens = token_generator_->Generate(1);
    confirmation.payment_token = tokens.front();

    const std::vector<BlindedToken>& blinded_tokens =
        privacy::BlindTokens(tokens);
    const BlindedToken blinded_token = blinded_tokens.front();
    confirmation.blinded_payment_token = blinded_token;

    std::string json;
    base::JSONWriter::Write(user_data, &json);
    confirmation.user_data = json;

    const std::string& payload = CreateConfirmationRequestDTO(confirmation);
    confirmation.credential = CreateCredential(unblinded_token, payload);

    ConfirmationsState::Get()->get_unblinded_tokens()->RemoveToken(
        unblinded_token);
    ConfirmationsState::Get()->Save();
  }

  return confirmation;
}

void Confirmations::CreateNewConfirmationAndAppendToRetryQueue(
    const ConfirmationInfo& confirmation) {
  DCHECK(confirmation.IsValid());

  if (ConfirmationsState::Get()->get_unblinded_tokens()->IsEmpty()) {
    AppendToRetryQueue(confirmation);
    return;
  }

  dto::user_data::Build(
      confirmation.creative_instance_id, confirmation.type,
      [=](const base::Value& user_data) {
        const base::DictionaryValue* user_data_dictionary = nullptr;
        user_data.GetAsDictionary(&user_data_dictionary);

        const ConfirmationInfo& new_confirmation = CreateConfirmation(
            confirmation.transaction_id, confirmation.creative_instance_id,
            confirmation.type, confirmation.ad_type, *user_data_dictionary);

        AppendToRetryQueue(new_confirmation);
      });
}

void Confirmations::AppendToRetryQueue(const ConfirmationInfo& confirmation) {
  DCHECK(confirmation.IsValid());

  ConfirmationsState::Get()->AppendFailedConfirmation(confirmation);
  ConfirmationsState::Get()->Save();

  BLOG(1, "Added " << std::string(confirmation.type) << " confirmation for "
                   << std::string(confirmation.ad_type) << " with id "
                   << confirmation.id << ", transaction id"
                   << confirmation.transaction_id
                   << " and creative instance id "
                   << confirmation.creative_instance_id
                   << " to the confirmations queue");
}

void Confirmations::RemoveFromRetryQueue(const ConfirmationInfo& confirmation) {
  DCHECK(confirmation.IsValid());

  if (!ConfirmationsState::Get()->RemoveFailedConfirmation(confirmation)) {
    BLOG(0, "Failed to remove "
                << std::string(confirmation.type) << " confirmation for "
                << std::string(confirmation.ad_type) << " with id "
                << confirmation.id << ", transaction id "
                << confirmation.transaction_id << " and creative instance id "
                << confirmation.creative_instance_id
                << " from the confirmations queue");

    return;
  }

  BLOG(1, "Removed " << std::string(confirmation.type) << " confirmation for "
                     << std::string(confirmation.ad_type) << " with id "
                     << confirmation.id << ", transaction id "
                     << confirmation.transaction_id
                     << " and creative instance id "
                     << confirmation.creative_instance_id
                     << " from the confirmations queue");

  ConfirmationsState::Get()->Save();
}

void Confirmations::OnDidSendConfirmation(
    const ConfirmationInfo& confirmation) {
  BLOG(1, "Successfully sent "
              << std::string(confirmation.type) << " confirmation for "
              << std::string(confirmation.ad_type) << " with id "
              << confirmation.id << ", transaction id "
              << confirmation.transaction_id << " and creative instance id "
              << confirmation.creative_instance_id);

  StopRetrying();

  ProcessRetryQueue();
}

void Confirmations::OnDidRedeemUnblindedToken(
    const ConfirmationInfo& confirmation,
    const privacy::UnblindedPaymentTokenInfo& unblinded_payment_token) {
  if (ConfirmationsState::Get()->get_unblinded_payment_tokens()->TokenExists(
          unblinded_payment_token)) {
    BLOG(1, "Unblinded payment token is a duplicate");
    OnFailedToRedeemUnblindedToken(confirmation, /* should_retry */ false);
    return;
  }

  ConfirmationsState::Get()->get_unblinded_payment_tokens()->AddTokens(
      {unblinded_payment_token});
  ConfirmationsState::Get()->Save();

  const int unblinded_payment_tokens_count =
      ConfirmationsState::Get()->get_unblinded_payment_tokens()->Count();

  const base::Time& next_token_redemption_at = base::Time::FromDoubleT(
      AdsClientHelper::Get()->GetDoublePref(prefs::kNextTokenRedemptionAt));

  BLOG(1, "Successfully redeemed unblinded token for "
              << std::string(confirmation.ad_type) << " with confirmation id "
              << confirmation.id << ", transaction id "
              << confirmation.transaction_id << ", creative instance id "
              << confirmation.creative_instance_id << " and "
              << std::string(confirmation.type) << ". You now have "
              << unblinded_payment_tokens_count
              << " unblinded payment tokens which will be redeemed "
              << FriendlyDateAndTime(next_token_redemption_at));

  NotifyDidConfirm(confirmation);

  StopRetrying();

  ProcessRetryQueue();
}

void Confirmations::OnFailedToRedeemUnblindedToken(
    const ConfirmationInfo& confirmation,
    const bool should_retry) {
  BLOG(1, "Failed to redeem unblinded token for "
              << std::string(confirmation.ad_type) << " with confirmation id "
              << confirmation.id << ", transaction id "
              << confirmation.transaction_id << ", creative instance id "
              << confirmation.creative_instance_id << " and "
              << std::string(confirmation.type));

  if (should_retry) {
    if (!confirmation.was_created) {
      CreateNewConfirmationAndAppendToRetryQueue(confirmation);
    } else {
      AppendToRetryQueue(confirmation);
    }
  }

  NotifyFailedToConfirm(confirmation);

  ProcessRetryQueue();
}

void Confirmations::NotifyDidConfirm(
    const ConfirmationInfo& confirmation) const {
  for (ConfirmationsObserver& observer : observers_) {
    observer.OnDidConfirm(confirmation);
  }
}

void Confirmations::NotifyFailedToConfirm(
    const ConfirmationInfo& confirmation) const {
  for (ConfirmationsObserver& observer : observers_) {
    observer.OnFailedToConfirm(confirmation);
  }
}

}  // namespace ads
