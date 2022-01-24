/* Copyright (c) 2022 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "brave/browser/brave_rewards/rewards_chrome_sync_client.h"

#include "base/path_service.h"
#include "base/task/post_task.h"
#include "base/task/thread_pool.h"
#include "base/threading/thread_restrictions.h"
#include "base/threading/thread_task_runner_handle.h"
#include "brave/components/brave_sync/brave_sync_prefs.h"
#include "chrome/browser/prefs/browser_prefs.h"
#include "chrome/browser/profiles/profile_impl.h"
#include "chrome/browser/spellchecker/spellcheck_factory.h"
#include "chrome/common/chrome_constants.h"
#include "chrome/common/chrome_paths.h"
#include "components/pref_registry/pref_registry_syncable.h"
#include "components/prefs/pref_registry_simple.h"
#include "components/prefs/pref_service_factory.h"
#include "components/sync/base/sync_prefs.h"
#include "components/sync/driver/glue/sync_transport_data_prefs.h"
#include "components/sync_device_info/device_info_prefs.h"
#include "components/sync_preferences/pref_service_syncable.h"
#include "components/sync_preferences/pref_service_syncable_factory.h"
#include "content/public/browser/browser_task_traits.h"
#include "content/public/browser/browser_thread.h"

using sync_preferences::PrefServiceSyncable;
using sync_preferences::PrefServiceSyncableFactory;

// namespace {
// auto GetUserDefaultProfileDir() {
//  base::FilePath path;
//  return base::PathService::Get(chrome::DIR_USER_DATA, &path)
//             ? path.AppendASCII(chrome::kInitialProfile)
//             : path;
//}
//
// auto CreatePrefService() {
//  std::unique_ptr<PrefServiceSyncable> service;
//
//  auto path = GetUserDefaultProfileDir();
//  if (!path.empty()) {
//    auto registry = base::MakeRefCounted<user_prefs::PrefRegistrySyncable>();
//    RegisterUserProfilePrefs(registry.get());
//    // registry->RegisterBooleanPref(
//    //    "browser.enable_spellchecking", true,
//    //    user_prefs::PrefRegistrySyncable::SYNCABLE_PREF);
//
//    PrefServiceSyncableFactory factory{};
//    factory.SetUserPrefsFile(
//        path.AppendASCII("VirtualGrants"),
//        base::ThreadPool::CreateSequencedTaskRunner(
//            {base::MayBlock(), base::TaskPriority::USER_VISIBLE,
//             base::TaskShutdownBehavior::BLOCK_SHUTDOWN})
//            .get());
//    service = factory.CreateSyncable(std::move(registry));
//  }
//
//  return service;
//}
//}  // namespace

namespace browser_sync {
RewardsChromeSyncClient::RewardsChromeSyncClient(Profile* profile)
    : ChromeSyncClient(profile),
      pref_service_(
          static_cast<PrefServiceSyncable*>(ChromeSyncClient::GetPrefService())
              ->CreateScopedPrefService(nullptr, {})) {}

RewardsChromeSyncClient::~RewardsChromeSyncClient() = default;

PrefService* RewardsChromeSyncClient::GetPrefService() {
  DCHECK(pref_service_);
  return pref_service_.get();
}
}  // namespace browser_sync