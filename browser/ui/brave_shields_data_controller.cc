/* Copyright (c) 2021 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "brave/browser/ui/brave_shields_data_controller.h"

#include <string>

#include "brave/components/brave_shields/browser/brave_shields_util.h"
#include "brave/components/brave_shields/common/brave_shield_constants.h"
#include "chrome/browser/browser_process.h"
#include "chrome/browser/content_settings/host_content_settings_map_factory.h"
#include "chrome/browser/profiles/profile.h"
#include "content/public/browser/navigation_handle.h"

namespace brave_shields {

BraveShieldsDataController::~BraveShieldsDataController() = default;

BraveShieldsDataController::BraveShieldsDataController(
    content::WebContents* web_contents)
    : content::WebContentsObserver(web_contents),
      content::WebContentsUserData<BraveShieldsDataController>(*web_contents) {}

void BraveShieldsDataController::DidFinishNavigation(
    content::NavigationHandle* navigation_handle) {
  if (navigation_handle->IsInMainFrame() && navigation_handle->HasCommitted() &&
      !navigation_handle->IsSameDocument()) {
    ClearAllResourcesList();
  }
}

void BraveShieldsDataController::ClearAllResourcesList() {
  resource_list_blocked_ads_.clear();
  resource_list_http_redirects_.clear();
  resource_list_blocked_js_.clear();
  resource_list_blocked_fingerprints_.clear();

  for (Observer& obs : observer_list_)
    obs.OnResourcesChanged();
}

void BraveShieldsDataController::AddObserver(Observer* obs) {
  observer_list_.AddObserver(obs);
}

void BraveShieldsDataController::RemoveObserver(Observer* obs) {
  observer_list_.RemoveObserver(obs);
}

bool BraveShieldsDataController::HasObserver(Observer* observer) {
  return observer_list_.HasObserver(observer);
}

int BraveShieldsDataController::GetTotalBlockedCount() {
  return (resource_list_blocked_ads_.size() +
          resource_list_http_redirects_.size() +
          resource_list_blocked_js_.size() +
          resource_list_blocked_fingerprints_.size());
}

bool BraveShieldsDataController::GetBraveShieldsEnabled() {
  auto* map = HostContentSettingsMapFactory::GetForProfile(
      GetWebContents().GetBrowserContext());
  return brave_shields::GetBraveShieldsEnabled(map, GetCurrentSiteURL());
}

GURL BraveShieldsDataController::GetCurrentSiteURL() {
  return GetWebContents().GetLastCommittedURL();
}

AdBlockMode BraveShieldsDataController::GetAdBlockMode() {
  auto* map = HostContentSettingsMapFactory::GetForProfile(
      GetWebContents().GetBrowserContext());

  ControlType control_type_ad =
      brave_shields::GetAdControlType(map, GetCurrentSiteURL());

  ControlType control_type_cosmetic =
      brave_shields::GetCosmeticFilteringControlType(map, GetCurrentSiteURL());

  if (control_type_ad == ControlType::ALLOW) {
    return AdBlockMode::ALLOW;
  }

  if (control_type_cosmetic == ControlType::BLOCK) {
    return AdBlockMode::AGGRESSIVE;
  } else {
    return AdBlockMode::STANDARD;
  }
}

void BraveShieldsDataController::SetAdBlockMode(AdBlockMode mode) {
  auto* map = HostContentSettingsMapFactory::GetForProfile(
      GetWebContents().GetBrowserContext());

  ControlType control_type_ad;
  ControlType control_type_cosmetic;

  if (mode == AdBlockMode::ALLOW) {
    control_type_ad = ControlType::ALLOW;
  } else {
    control_type_ad = ControlType::BLOCK;
  }

  if (mode == AdBlockMode::AGGRESSIVE) {
    control_type_cosmetic = ControlType::BLOCK;  // aggressive
  } else {
    control_type_cosmetic = ControlType::BLOCK_THIRD_PARTY;  // standard
  }

  brave_shields::SetAdControlType(map, control_type_ad, GetCurrentSiteURL(),
                                  g_browser_process->local_state());

  brave_shields::SetCosmeticFilteringControlType(
      map, control_type_cosmetic, GetCurrentSiteURL(),
      g_browser_process->local_state());

  GetWebContents().GetController().Reload(content::ReloadType::NORMAL, true);
}

void BraveShieldsDataController::HandleItemBlocked(
    const std::string& block_type,
    const std::string& subresource) {
  auto subres = GURL(subresource);

  if (block_type == kAds) {
    resource_list_blocked_ads_.insert(subres);
  } else if (block_type == kHTTPUpgradableResources) {
    resource_list_http_redirects_.insert(subres);
  } else if (block_type == kJavaScript) {
    resource_list_blocked_js_.insert(subres);
  } else if (block_type == kFingerprintingV2) {
    resource_list_blocked_fingerprints_.insert(subres);
  }

  for (Observer& obs : observer_list_)
    obs.OnResourcesChanged();
}

WEB_CONTENTS_USER_DATA_KEY_IMPL(BraveShieldsDataController);

}  // namespace brave_shields
