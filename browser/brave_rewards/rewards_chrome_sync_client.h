/* Copyright (c) 2022 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef BRAVE_BROWSER_BRAVE_REWARDS_REWARDS_CHROME_SYNC_CLIENT_H_
#define BRAVE_BROWSER_BRAVE_REWARDS_REWARDS_CHROME_SYNC_CLIENT_H_

#include "chrome/browser/sync/chrome_sync_client.h"

#include "components/prefs/pref_service.h"
#include "components/sync_preferences/pref_service_syncable.h"

namespace browser_sync {
class RewardsChromeSyncClient : public ChromeSyncClient {
 public:
  explicit RewardsChromeSyncClient(Profile* profile);

  ~RewardsChromeSyncClient() override;

  PrefService* GetPrefService() override;

 private:
  std::unique_ptr<sync_preferences::PrefServiceSyncable> pref_service_;
};
}  // namespace browser_sync

#endif  // BRAVE_BROWSER_BRAVE_REWARDS_REWARDS_CHROME_SYNC_CLIENT_H_
