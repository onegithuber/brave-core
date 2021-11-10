/* Copyright (c) 2021 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef BRAVE_COMPONENTS_BRAVE_FEDERATED_DATA_STORE_SERVICE_H_
#define BRAVE_COMPONENTS_BRAVE_FEDERATED_DATA_STORE_SERVICE_H_

#include "base/files/file_path.h"
#include "base/memory/ref_counted.h"
#include "base/memory/weak_ptr.h"
#include "base/task/sequenced_task_runner.h"
#include "base/threading/sequence_bound.h"

namespace brave {

namespace federated {

class AdNotificationTimingDataStore;

class DataStoreService {
 public:
  explicit DataStoreService(const base::FilePath& base_database_path);
  ~DataStoreService();

  DataStoreService(const DataStoreService&) = delete;
  DataStoreService& operator=(const DataStoreService&) = delete;

  void Init();
  base::SequenceBound<AdNotificationTimingDataStore>*
  getAdNotificationTimingDataStore();

  bool DeleteDatabase();

 private:
  void EnforceRetentionPolicies();
  void OnInitComplete(bool success);

  base::FilePath db_path_;
  base::SequenceBound<AdNotificationTimingDataStore>
      ad_notification_timing_data_store_;
  base::WeakPtrFactory<DataStoreService> weak_factory_;
};

}  // namespace federated

}  // namespace brave

#endif  // BRAVE_COMPONENTS_BRAVE_FEDERATED_DATA_STORE_SERVICE_H_
