import * as React from 'react'

import { SiteBlockInfo, SiteSettings } from '../api/panel_browser_api'

interface Store {
  siteSettings?: SiteSettings
  siteBlockInfo?: SiteBlockInfo
}

const defaultStore = {
  siteSettings: undefined,
  siteBlockInfo: undefined
}

const DataContext = React.createContext<Store>(defaultStore)

export default DataContext
