/* Copyright (c) 2021 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef BRAVE_BROWSER_UI_WEBUI_SETTINGS_BRAVE_WALLET_HANDLER_H_
#define BRAVE_BROWSER_UI_WEBUI_SETTINGS_BRAVE_WALLET_HANDLER_H_

#include <string>
#include <utility>

#include "base/memory/weak_ptr.h"
#include "brave/components/brave_wallet/browser/json_rpc_service.h"
#include "brave/components/brave_wallet/common/brave_wallet.mojom.h"
#include "chrome/browser/ui/webui/settings/settings_page_ui_handler.h"

class Profile;
class TestBraveWalletHandler;

class BraveWalletHandler : public settings::SettingsPageUIHandler {
 public:
  BraveWalletHandler();
  ~BraveWalletHandler() override;

  void SetChainCallbackForTesting(base::OnceClosure callback) {
    chain_callback_for_testing_ = std::move(callback);
  }

 private:
  friend TestBraveWalletHandler;
  // SettingsPageUIHandler overrides:
  void RegisterMessages() override;
  void OnJavascriptAllowed() override {}
  void OnJavascriptDisallowed() override {}

  void GetAutoLockMinutes(base::Value::ConstListView args);
  void RemoveEthereumChain(base::Value::ConstListView args);
  void GetCustomNetworksList(base::Value::ConstListView args);
  void AddEthereumChain(base::Value::ConstListView args);
  void SetActiveNetwork(base::Value::ConstListView args);

  BraveWalletHandler(const BraveWalletHandler&) = delete;
  BraveWalletHandler& operator=(const BraveWalletHandler&) = delete;

  void OnAddCustomChain(base::Value javascript_callback,
                        const std::string& chain_id,
                        brave_wallet::mojom::ProviderError error,
                        const std::string& error_message);
  base::OnceClosure chain_callback_for_testing_;
  base::WeakPtrFactory<BraveWalletHandler> weak_ptr_factory_{this};
};

#endif  // BRAVE_BROWSER_UI_WEBUI_SETTINGS_BRAVE_WALLET_HANDLER_H_
