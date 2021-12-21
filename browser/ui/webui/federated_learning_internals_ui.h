/* Copyright (c) 2021 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef BRAVE_BROWSER_UI_WEBUI_FEDERATED_LEARNING_INTERNALS_UI_H_
#define BRAVE_BROWSER_UI_WEBUI_FEDERATED_LEARNING_INTERNALS_UI_H_

#include <memory>
#include <string>
#include <vector>

#include "base/callback.h"
#include "base/callback_list.h"
#include "base/macros.h"
#include "brave/components/brave_federated/data_stores/ad_notification_timing_data_store.h"
#include "content/public/browser/web_ui_controller.h"
#include "content/public/browser/web_ui_message_handler.h"

class Profile;

namespace brave {
namespace federated {
class DataStoreService;
}
}  // namespace brave

class FederatedLearningInternalsHandler : public content::WebUIMessageHandler {
 public:
  explicit FederatedLearningInternalsHandler(Profile* profile);

  FederatedLearningInternalsHandler(const FederatedLearningInternalsHandler&) =
      delete;
  FederatedLearningInternalsHandler& operator=(
      const FederatedLearningInternalsHandler&) = delete;

  ~FederatedLearningInternalsHandler() override;

  using MessageCallback = base::RepeatingCallback<void(const base::ListValue*)>;

  void RegisterMessageCallback(const std::string& message,
                               const MessageCallback& callback);
  void CallJavascriptFunction(const std::string& function_name,
                              const std::vector<const base::Value*>& args);

  // content::WebUIMessageHandler methods:
  void RegisterMessages() override;

  void RegisterMessageCallbacks();

  void OnAdStoreRequestInfo(const base::ListValue* args);
  void OnAdStoreLogsReceivedCallback(
      brave::federated::AdNotificationTimingDataStore::
          IdToAdNotificationTimingTaskLogMap ad_notification_timing_logs);
  // void OnAdsTimingDataStoreLogsLoaded(AdNotificationTimingTaskLog[] logs);

 private:
  // Sends a message to Javascript.
  void SendMessageToJs(const std::string& message, const base::Value& value);

  std::shared_ptr<brave::federated::DataStoreService>
      data_store_service_;
};

class FederatedLearningInternalsUI : public content::WebUIController {
 public:
  FederatedLearningInternalsUI(content::WebUI* web_ui, const std::string& host);
  ~FederatedLearningInternalsUI() override;
  FederatedLearningInternalsUI(const FederatedLearningInternalsUI&) = delete;
  FederatedLearningInternalsUI& operator=(const FederatedLearningInternalsUI&) =
      delete;
};

#endif  // BRAVE_BROWSER_UI_WEBUI_FEDERATED_LEARNING_INTERNALS_UI_H_
