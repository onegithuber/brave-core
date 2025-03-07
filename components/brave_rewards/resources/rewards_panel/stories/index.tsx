/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import * as React from 'react'

import { Host, HostState } from '../lib/interfaces'
import { Notification } from '../../shared/components/notifications'
import { localeStrings } from './locale_strings'
import { createStateManager } from '../../shared/lib/state_manager'

import { LocaleContext } from '../../shared/lib/locale_context'
import { WithThemeVariables } from '../../shared/components/with_theme_variables'
import { NotificationCard } from '../components/notification_card'

import { App } from '../components/app'

import grantCaptchaImageURL from './grant_captcha_image.png'

export default {
  title: 'Rewards/Panel'
}

const locale = {
  getString (key: string) {
    return localeStrings[key] || 'MISSING'
  }
}

function createHost (): Host {
  const stateManager = createStateManager<HostState>({
    loading: false,
    rewardsEnabled: false,
    settings: {
      adsPerHour: 3,
      autoContributeEnabled: true,
      autoContributeAmount: 5
    },
    options: {
      autoContributeAmounts: [1, 5, 10, 15]
    },
    grantCaptchaInfo: {
      id: '123',
      imageURL: grantCaptchaImageURL,
      hint: 'square',
      status: 'pending',
      grantInfo: {
        id: 'grant123',
        createdAt: Date.now(),
        expiresAt: Date.now() + 120_000,
        amount: 10,
        type: 'ads'
      }
    },
    externalWalletProviders: ['uphold', 'gemini'],
    balance: 10.2,
    exchangeInfo: {
      rate: 0.75,
      currency: 'USD'
    },
    earningsInfo: {
      earningsThisMonth: 1.2,
      earningsLastMonth: 2.4,
      nextPaymentDate: Date.now() + 1000 * 60 * 60 * 24 * 3
    },
    publisherInfo: {
      id: 'brave.com',
      name: 'brave.com',
      icon: 'https://brave.com/static-assets/images/brave-favicon.png',
      platform: null,
      registered: true,
      attentionScore: 0.17,
      autoContributeEnabled: true,
      monthlyContribution: 5,
      supportedWalletProviders: []
    },
    publisherRefreshing: false,
    externalWallet: {
      provider: 'uphold',
      username: 'brave123',
      status: 'verified',
      links: {}
    },
    summaryData: {
      adEarnings: 10,
      autoContributions: 10,
      oneTimeTips: -2,
      monthlyTips: -19,
      pendingTips: 0
    },
    notifications: [
      {
        type: 'backup-wallet',
        id: '1',
        timeStamp: Date.now() - 100
      },
      {
        type: 'external-wallet-verified',
        id: '2',
        timeStamp: Date.now(),
        provider: 'uphold'
      } as any
    ]
  })

  return {
    get state () { return stateManager.getState() },

    addListener: stateManager.addListener,

    getString: locale.getString,

    refreshPublisherStatus () {
      console.log('refreshPublisherStatus')
    },

    enableRewards () {
      stateManager.update({
        rewardsEnabled: true
      })
    },

    setAutoContributeAmount (amount) {
      stateManager.update({
        settings: {
          ...stateManager.getState().settings,
          autoContributeAmount: amount
        }
      })
    },

    setAdsPerHour (adsPerHour) {
      stateManager.update({
        settings: {
          ...stateManager.getState().settings,
          adsPerHour
        }
      })
    },

    setIncludeInAutoContribute (enabled) {
      const { publisherInfo } = stateManager.getState()
      if (publisherInfo) {
        stateManager.update({
          publisherInfo: {
            ...publisherInfo,
            autoContributeEnabled: enabled
          }
        })
      }
    },

    openRewardsSettings () {
      console.log('openRewardsSettings')
    },

    sendTip () {
      console.log('sendTip')
    },

    handleMonthlyTipAction (action) {
      switch (action) {
        case 'update': {
          console.log('updateMonthlyTip')
          break
        }
        case 'cancel': {
          const { publisherInfo } = stateManager.getState()
          if (publisherInfo) {
            stateManager.update({
              publisherInfo: {
                ...publisherInfo,
                monthlyContribution: 0
              }
            })
          }
        }
      }
    },

    handleExternalWalletAction (action) {
      console.log('externalWalletAction', action)
    },

    handleNotificationAction (action) {
      console.log('notificationAction', action)
    },

    dismissNotification (notification) {
      const { notifications } = stateManager.getState()
      stateManager.update({
        notifications: notifications.filter((n) => {
          return n.id !== notification.id
        })
      })
    },

    solveGrantCaptcha (solution) {
      console.log('solveGrantCaptcha', solution)
      const { grantCaptchaInfo } = stateManager.getState()
      if (!grantCaptchaInfo) {
        return
      }
      stateManager.update({
        grantCaptchaInfo: {
          ...grantCaptchaInfo,
          status: 'passed'
        }
      })
    },

    clearGrantCaptcha () {
      stateManager.update({
        grantCaptchaInfo: null
      })
    }
  }
}

export function MainPanel () {
  const [host] = React.useState(() => createHost())
  return (
    <App host={host} />
  )
}

export function Notification () {
  return (
    <LocaleContext.Provider value={locale}>
      <WithThemeVariables>
        <div style={{ width: '375px' }}>
          <NotificationCard
            notification={{
              type: 'backup-wallet',
              id: '123',
              timeStamp: Date.now()
            }}
          />
        </div>
      </WithThemeVariables>
    </LocaleContext.Provider>
  )
}
