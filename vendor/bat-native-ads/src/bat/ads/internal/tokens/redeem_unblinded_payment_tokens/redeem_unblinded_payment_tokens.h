/* Copyright (c) 2019 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef BRAVE_VENDOR_BAT_NATIVE_ADS_SRC_BAT_ADS_INTERNAL_TOKENS_REDEEM_UNBLINDED_PAYMENT_TOKENS_REDEEM_UNBLINDED_PAYMENT_TOKENS_H_
#define BRAVE_VENDOR_BAT_NATIVE_ADS_SRC_BAT_ADS_INTERNAL_TOKENS_REDEEM_UNBLINDED_PAYMENT_TOKENS_REDEEM_UNBLINDED_PAYMENT_TOKENS_H_

#include "base/check_op.h"
#include "bat/ads/internal/account/wallet/wallet_info.h"
#include "bat/ads/internal/backoff_timer.h"
#include "bat/ads/internal/privacy/unblinded_payment_tokens/unblinded_payment_token_info_aliases.h"
#include "bat/ads/internal/timer.h"
#include "bat/ads/internal/tokens/redeem_unblinded_payment_tokens/redeem_unblinded_payment_tokens_delegate.h"
#include "bat/ads/public/interfaces/ads.mojom.h"

namespace base {
class Time;
class TimeDelta;
}  // namespace base

namespace ads {

class RedeemUnblindedPaymentTokens final {
 public:
  RedeemUnblindedPaymentTokens();
  ~RedeemUnblindedPaymentTokens();

  void set_delegate(RedeemUnblindedPaymentTokensDelegate* delegate) {
    DCHECK_EQ(delegate_, nullptr);
    delegate_ = delegate;
  }

  void MaybeRedeemAfterDelay(const WalletInfo& wallet);

 private:
  WalletInfo wallet_;

  Timer timer_;

  void Redeem();
  void OnRedeem(
      const mojom::UrlResponse& url_response,
      const privacy::UnblindedPaymentTokenList& unblinded_payment_tokens);

  void OnDidRedeemUnblindedPaymentTokens(
      const privacy::UnblindedPaymentTokenList& unblinded_payment_tokens);

  void OnFailedToRedeemUnblindedPaymentTokens();

  void ScheduleNextTokenRedemption();

  BackoffTimer retry_timer_;
  void Retry();
  void OnRetry();

  bool is_processing_ = false;

  base::TimeDelta CalculateTokenRedemptionDelay();
  base::Time CalculateNextTokenRedemptionDate();

  RedeemUnblindedPaymentTokensDelegate* delegate_ = nullptr;
};

}  // namespace ads

#endif  // BRAVE_VENDOR_BAT_NATIVE_ADS_SRC_BAT_ADS_INTERNAL_TOKENS_REDEEM_UNBLINDED_PAYMENT_TOKENS_REDEEM_UNBLINDED_PAYMENT_TOKENS_H_
