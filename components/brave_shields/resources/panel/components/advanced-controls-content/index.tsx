import * as React from 'react'

import * as S from './style'
import Toggle from '../../../../../web-components/toggle'
import { getLocale } from '../../../../../common/locale'
import getPanelBrowserAPI, { AdBlockMode, CookieBlockMode, FingerprintMode } from '../../api/panel_browser_api'
import DataContext from '../../state/context'

const adBlockModeOptions = [
  { value: AdBlockMode.AGGRESSIVE, text: getLocale('braveShieldsTrackersAndAdsBlockedAgg') },
  { value: AdBlockMode.STANDARD, text: getLocale('braveShieldsTrackersAndAdsBlockedStd') },
  { value: AdBlockMode.ALLOW, text: getLocale('braveShieldsTrackersAndAdsAllowAll') }
]

const cookieBlockModeOptions = [
  { value: CookieBlockMode.CROSS_SITE_BLOCKED, text: getLocale('braveShieldsCrossCookiesBlocked') },
  { value: CookieBlockMode.BLOCKED, text: getLocale('braveShieldsCookiesBlocked') },
  { value: CookieBlockMode.ALLOW, text: getLocale('braveShieldsCookiesBlockedAll') }
]

const fingerprintModeOptions = [
  { value: FingerprintMode.STANDARD, text: getLocale('braveShieldsFingerprintingBlockedStd') },
  { value: FingerprintMode.STRICT, text: getLocale('braveShieldsFingerprintingBlockedAgg') },
  { value: FingerprintMode.ALLOW, text: getLocale('braveShieldsFingerprintingAllowAll') }
]

function GlobalSettings () {
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const target = e.target as HTMLAnchorElement
    getPanelBrowserAPI().panelHandler.openURL({ url: target.href })
  }

  return (
    <S.SettingsBox>
      <S.SettingsTitle>{getLocale('braveShieldsGlobalSettingsTitle')}</S.SettingsTitle>
      <a
        href='chrome://settings/shields'
        onClick={handleAnchorClick}
      >
        <S.GlobeIcon />
        {getLocale('braveShieldsChangeDefaults')}
      </a>
      <a
        href='chrome://adblock'
        onClick={handleAnchorClick}
      >
        <S.ListIcon />
        {getLocale('braveShieldsCustomizeAdblockLists')}
      </a>
    </S.SettingsBox>
  )
}

function AdvancedControlsContent () {
  const { siteSettings } = React.useContext(DataContext)

  return (
    <section
      id='advanced-controls-content'
      aria-label={getLocale('braveShieldsAdvancedCtrls')}
    >
      <S.SettingsBox>
        <S.SettingsTitle>brave.com</S.SettingsTitle>
        <S.SettingsDesc>{getLocale('braveShieldSettingsDescription')}</S.SettingsDesc>
        <S.ControlGroup>
          <S.ControlCount
            aria-label={getLocale('braveShieldsTrackersAndAds')}
            aria-expanded='false'
          >
            <S.CaratDown />
            <span>10</span>
          </S.ControlCount>
          <select
            value={siteSettings?.adBlockMode}
            aria-label={getLocale('braveShieldsTrackersAndAds')}
          >
            {adBlockModeOptions.map((entry, i) => {
              return (
                <option value={entry.value} key={i}>
                  {entry.text}
                </option>
              )
            })}
          </select>
        </S.ControlGroup>
        <S.ControlGroup>
          <S.ControlCount disabled />
          <select
            value={siteSettings?.cookieBlockMode}
            aria-label={getLocale('braveShieldsCookiesBlocked')}
          >
              {cookieBlockModeOptions.map((entry, i) => {
                return (
                  <option value={entry.value} key={i}>
                    {entry.text}
                  </option>
                )
              })}
          </select>
        </S.ControlGroup>
        <S.ControlGroup>
          <S.ControlCount
            aria-label={getLocale('braveShieldsFingerprintingBlocked')}
            aria-expanded='false'
            disabled
          >
            <S.CaratDown />
            <span>0</span>
          </S.ControlCount>
          <select
            value={siteSettings?.fingerprintMode}
            aria-label={getLocale('braveShieldsFingerprintingBlocked')}
          >
            {fingerprintModeOptions.map((entry, i) => {
                return (
                  <option value={entry.value} key={i}>
                    {entry.text}
                  </option>
                )
              })}
          </select>
        </S.ControlGroup>
        <S.ControlGroup>
          <S.ControlCount
            aria-label={getLocale('braveShieldsConnectionsUpgraded')}
            aria-expanded='false'
            disabled
          >
            <S.CaratDown />
            <span>0</span>
          </S.ControlCount>
          <label>
            <span>{getLocale('braveShieldsConnectionsUpgraded')}</span>
            <Toggle
              isOn={siteSettings?.isHttpsEverywhereEnabled}
              size='sm'
              accessibleLabel='Enable HTTPS'
            />
          </label>
        </S.ControlGroup>
        <S.ControlGroup>
          <S.ControlCount
            aria-label={getLocale('braveShieldsScriptsBlocked')}
            aria-expanded='false'
            disabled
          >
            <S.CaratDown />
            <span>0</span>
          </S.ControlCount>
          <label>
            <span>{getLocale('braveShieldsScriptsBlocked')}</span>
            <Toggle
              isOn={siteSettings?.isNoscriptEnabled}
              size='sm'
              accessibleLabel={getLocale('braveShieldsScriptsBlockedEnable')}
            />
          </label>
        </S.ControlGroup>
      </S.SettingsBox>
      <GlobalSettings />
  </section>
  )
}

export default AdvancedControlsContent
