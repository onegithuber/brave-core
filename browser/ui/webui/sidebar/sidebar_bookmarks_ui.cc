// Copyright (c) 2022 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// you can obtain one at http://mozilla.org/MPL/2.0/.

#include "brave/browser/ui/webui/sidebar/sidebar_bookmarks_ui.h"

#include <utility>

#include "brave/browser/ui/webui/sidebar/sidebar_bookmarks_page_handler.h"
#include "brave/common/webui_url_constants.h"
#include "chrome/browser/profiles/profile.h"
#include "components/bookmarks/common/bookmark_pref_names.h"
#include "components/prefs/pref_service.h"
#include "content/public/browser/web_contents.h"
#include "content/public/browser/web_ui.h"
#include "content/public/browser/web_ui_data_source.h"

SidebarBookmarksUI::SidebarBookmarksUI(content::WebUI* web_ui)
    : ui::MojoWebUIController(web_ui) {
  content::WebUIDataSource* source =
      content::WebUIDataSource::Create(kSidebarBookmarksHost);
  Profile* const profile = Profile::FromWebUI(web_ui);
  PrefService* prefs = profile->GetPrefs();
  source->AddBoolean(
      "bookmarksDragAndDropEnabled",
      prefs->GetBoolean(bookmarks::prefs::kEditBookmarksEnabled));
  // TODO(simonhong): Set sidebar bookmarks data source.
  content::WebUIDataSource::Add(web_ui->GetWebContents()->GetBrowserContext(),
                                source);
}

SidebarBookmarksUI::~SidebarBookmarksUI() = default;

WEB_UI_CONTROLLER_TYPE_IMPL(SidebarBookmarksUI)

void SidebarBookmarksUI::BindInterface(
    mojo::PendingReceiver<sidebar::mojom::BookmarksPageHandlerFactory>
        receiver) {
  bookmarks_page_factory_receiver_.reset();
  bookmarks_page_factory_receiver_.Bind(std::move(receiver));
}

void SidebarBookmarksUI::CreateBookmarksPageHandler(
    mojo::PendingReceiver<sidebar::mojom::BookmarksPageHandler> receiver) {
  bookmarks_page_handler_ =
      std::make_unique<SidebarBookmarksPageHandler>(std::move(receiver));
}
