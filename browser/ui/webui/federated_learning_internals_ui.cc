/* Copyright (c) 2021 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "brave/browser/ui/webui/federated_learning_internals_ui.h"

#include <memory>
#include <utility>
#include <vector>

#include "base/bind.h"
#include "base/callback_helpers.h"
#include "base/values.h"
#include "brave/browser/brave_federated/brave_federated_service_factory.h"
#include "brave/browser/ui/webui/brave_webui_source.h"
#include "brave/common/webui_url_constants.h"
#include "brave/components/brave_federated/brave_federated_service.h"
#include "brave/components/brave_federated/data_store_service.h"
#include "brave/components/brave_federated/data_stores/ad_notification_timing_data_store.h"
#include "chrome/browser/profiles/profile.h"
#include "chrome/grit/browser_resources.h"
#include "chrome/grit/generated_resources.h"
#include "components/grit/brave_components_resources.h"
#include "content/public/browser/browser_context.h"
#include "content/public/browser/web_contents.h"
#include "content/public/browser/web_ui.h"
#include "content/public/browser/web_ui_data_source.h"

// DEBUG
#include <iostream>

FederatedLearningInternalsHandler::FederatedLearningInternalsHandler(
    Profile* profile) {
  data_store_service_ =
      brave::BraveFederatedServiceFactory::GetForBrowserContext(profile)
          ->GetDataStoreService();
}

FederatedLearningInternalsHandler::~FederatedLearningInternalsHandler() =
    default;

void FederatedLearningInternalsHandler::RegisterMessageCallbacks() {
  RegisterMessageCallback(
      "requestAdStoreInfo",
      base::BindRepeating(
          &FederatedLearningInternalsHandler::OnAdStoreRequestInfo,
          base::Unretained(this)));
}

void FederatedLearningInternalsHandler::OnAdStoreRequestInfo(
    const base::ListValue* args) {
  auto* const ad_notification_data_store =
      data_store_service_->getAdNotificationTimingDataStore();

  ad_notification_data_store
      ->AsyncCall(
          &brave::federated::AdNotificationTimingDataStore::LoadLogs)
      .Then(base::BindOnce(
          &FederatedLearningInternalsHandler::OnAdStoreLogsReceivedCallback,
          base::Unretained(this)));
}

void FederatedLearningInternalsHandler::OnAdStoreLogsReceivedCallback(
    brave::federated::AdNotificationTimingDataStore::
        IdToAdNotificationTimingTaskLogMap ad_notification_timing_logs) {
  auto list_value = std::make_unique<base::ListValue>();
  for (auto const& object : ad_notification_timing_logs) {
    auto dict = std::make_unique<base::DictionaryValue>();
    auto log = object.second;
    dict->SetIntKey("id", log.id);
    dict->SetDoubleKey("time", log.time.ToJsTime());
    dict->SetStringKey("locale", log.locale);
    dict->SetIntKey("number_of_tabs", log.number_of_tabs);
    dict->SetBoolKey("label", log.label);
    list_value->Append(std::move(dict));
  }
  SendMessageToJs("adsTimingDataStoreLogsLoaded", *list_value);
}

void FederatedLearningInternalsHandler::SendMessageToJs(
    const std::string& message,
    const base::Value& value) {
  const char func[] = "cr.webUIListenerCallback";
  base::Value message_data(message);
  std::vector<const base::Value*> args{&message_data, &value};
  CallJavascriptFunction(func, args);
}

void FederatedLearningInternalsHandler::RegisterMessageCallback(
    const std::string& message,
    const MessageCallback& callback) {
  web_ui()->RegisterDeprecatedMessageCallback(message, callback);
}

void FederatedLearningInternalsHandler::CallJavascriptFunction(
    const std::string& function_name,
    const std::vector<const base::Value*>& args) {
  web_ui()->CallJavascriptFunctionUnsafe(function_name, args);
}

void FederatedLearningInternalsHandler::RegisterMessages() {
  RegisterMessageCallbacks();
}

FederatedLearningInternalsUI::FederatedLearningInternalsUI(
    content::WebUI* web_ui,
    const std::string& name)
    : WebUIController(web_ui) {
  Profile* profile = Profile::FromWebUI(web_ui);

  content::WebUIDataSource* html_source =
      content::WebUIDataSource::Create(kFederatedLearningInternalsHost);

  html_source->AddString("userName", "Bob");
  html_source->UseStringsJs();

  html_source->AddResourcePath("federated_learning_internals.css",
                               IDR_FEDERATED_LEARNING_INTERNALS_CSS);
  html_source->AddResourcePath("federated_learning_internals.js",
                               IDR_FEDERATED_LEARNING_INTERNALS_JS);
  html_source->SetDefaultResource(IDR_FEDERATED_LEARNING_INTERNALS_HTML);

  content::BrowserContext* browser_context =
      web_ui->GetWebContents()->GetBrowserContext();
  content::WebUIDataSource::Add(browser_context, html_source);

  web_ui->AddMessageHandler(
      std::make_unique<FederatedLearningInternalsHandler>(profile));
}

FederatedLearningInternalsUI::~FederatedLearningInternalsUI() {}
