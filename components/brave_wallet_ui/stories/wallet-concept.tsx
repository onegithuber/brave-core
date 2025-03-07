import * as React from 'react'
import { WalletWidgetStandIn } from './style'
import {
  // SideNav,
  WalletPageLayout,
  WalletSubViewLayout,
  LockScreen,
  OnboardingRestore
} from '../components/desktop'
import {
  NavTypes,
  BraveWallet,
  PriceDataObjectType,
  RPCResponseType,
  OrderTypes,
  UserAccountType,
  SlippagePresetObjectType,
  ExpirationPresetObjectType,
  ToOrFromType,
  AccountTransactions,
  BuySendSwapTypes,
  WalletAccountType,
  ImportWalletError
} from '../constants/types'
import Onboarding from './screens/onboarding'
import BackupWallet from './screens/backup-wallet'
import CryptoStoryView from './screens/crypto-story-view'
import './locale'
// import { NavOptions } from '../options/side-nav-options'
import { AccountAssetOptions, NewAssetOptions } from '../options/asset-options'
import { SlippagePresetOptions } from '../options/slippage-preset-options'
import { ExpirationPresetOptions } from '../options/expiration-preset-options'
import BuySendSwap from './screens/buy-send-swap'
import { recoveryPhrase, mockUserAccounts } from './mock-data/user-accounts'
import { mockRPCResponse } from './mock-data/rpc-response'
import { CurrentPriceMockData } from './mock-data/current-price-data'
import { PriceHistoryMockData } from './mock-data/price-history-data'
import { mockUserWalletPreferences } from './mock-data/user-wallet-preferences'
import { formatWithCommasAndDecimals } from '../utils/format-prices'
import { getLocale } from '../../common/locale'
import {
  HardwareWalletConnectOpts
} from '../components/desktop/popup-modals/add-account-modal/hardware-wallet-connect/types'
import { mockNetworks } from './mock-data/mock-networks'
import { isStrongPassword } from '../utils/password-utils'
export default {
  title: 'Wallet/Desktop',
  argTypes: {
    onboarding: { control: { type: 'boolean', onboard: false } },
    locked: { control: { type: 'boolean', lock: false } }
  }
}

export const transactionDummyData: AccountTransactions = {
  [mockUserAccounts[0].id]: [
    {
      fromAddress: '0x7d66c9ddAED3115d93Bd1790332f3Cd06Cf52B14',
      id: '13cf4882-d3c0-44cd-a8c2-aca1fcf85c4a',
      txData: {
        baseData: {
          data: Array.from(new Uint8Array(24)),
          gasLimit: '0xfde8',
          gasPrice: '0x20000000000',
          nonce: '0x1',
          to: '0xcd3a3f8e0e4bdc174c9e2e63b4c22e15a7f7f92a',
          value: '0xb1a2bc2ec50000'
        },
        chainId: '',
        maxFeePerGas: '',
        maxPriorityFeePerGas: '',
        gasEstimation: undefined
      },
      txHash: '0x55732e30af74a450cd438be2a02c765ea62cb4ec8dda5cb12ed8dc5d21ac15d3',
      txStatus: 3,
      txArgs: [],
      txParams: [],
      txType: 0,
      createdTime: { microseconds: BigInt(0) },
      submittedTime: { microseconds: BigInt(0) },
      confirmedTime: { microseconds: BigInt(0) }
    },
    {
      fromAddress: '0x7843981e0b96135073b26043ea24c950d4ec385b',
      id: '13cf4882-d3c0-44cd-a8c2-aca1fcf85c4a',
      txData: {
        baseData: {
          data: Array.from(new Uint8Array(24)),
          gasLimit: '0xfde8',
          gasPrice: '0x20000000000',
          nonce: '0x1',
          to: '0x7d66c9ddAED3115d93Bd1790332f3Cd06Cf52B14',
          value: '0xb1a2bc2ec90000'
        },
        chainId: '',
        maxFeePerGas: '',
        maxPriorityFeePerGas: '',
        gasEstimation: undefined
      },
      txHash: '0x55732e30af74a450cd438be2a02c765ea62cb4ec8dda5cb12ed8dc5d21ac15d3',
      txStatus: 4,
      txArgs: [],
      txParams: [],
      txType: 0,
      createdTime: { microseconds: BigInt(0) },
      submittedTime: { microseconds: BigInt(0) },
      confirmedTime: { microseconds: BigInt(0) }
    },
    {
      fromAddress: '0x7d66c9ddAED3115d93Bd1790332f3Cd06Cf52B14',
      id: '13cf4882-d3c0-44cd-a8c2-aca1fcf85c4a',
      txData: {
        baseData: {
          data: Array.from(new Uint8Array(24)),
          gasLimit: '0xfde8',
          gasPrice: '0x20000000000',
          nonce: '0x1',
          to: '0xcd3a3f8e0e4bdc174c9e2e63b4c22e15a7f7f92a',
          value: '0xb1a2bc2ec90000'
        },
        chainId: '',
        maxFeePerGas: '',
        maxPriorityFeePerGas: '',
        gasEstimation: undefined
      },
      txHash: '0x55732e30af74a450cd438be2a02c765ea62cb4ec8dda5cb12ed8dc5d21ac15d3',
      txStatus: 2,
      txArgs: [],
      txParams: [],
      txType: 0,
      createdTime: { microseconds: BigInt(0) },
      submittedTime: { microseconds: BigInt(0) },
      confirmedTime: { microseconds: BigInt(0) }
    },
    {
      fromAddress: '0x7d66c9ddAED3115d93Bd1790332f3Cd06Cf52B14',
      id: '13cf4882-d3c0-44cd-a8c2-aca1fcf85c4a',
      txData: {
        baseData: {
          data: Array.from(new Uint8Array(24)),
          gasLimit: '0xfde8',
          gasPrice: '0x20000000000',
          nonce: '0x1',
          to: '0xcd3a3f8e0e4bdc174c9e2e63b4c22e15a7f7f92a',
          value: '0xb1a2bc2ec90000'
        },
        chainId: '',
        maxFeePerGas: '',
        maxPriorityFeePerGas: '',
        gasEstimation: undefined
      },
      txHash: '0x55732e30af74a450cd438be2a02c765ea62cb4ec8dda5cb12ed8dc5d21ac15d3',
      txStatus: 1,
      txArgs: [],
      txParams: [],
      txType: 0,
      createdTime: { microseconds: BigInt(0) },
      submittedTime: { microseconds: BigInt(0) },
      confirmedTime: { microseconds: BigInt(0) }
    }
  ],
  [mockUserAccounts[1].id]: [
    {
      fromAddress: '0x73A29A1da97149722eB09c526E4eAd698895bDCf',
      id: '13cf4882-d3c0-44cd-a8c2-aca1fcf85c4a',
      txData: {
        baseData: {
          data: Array.from(new Uint8Array(24)),
          gasLimit: '0xfde8',
          gasPrice: '0x20000000000',
          nonce: '0x1',
          to: '0xcd3a3f8e0e4bdc174c9e2e63b4c22e15a7f7f92a',
          value: '0xb1a2bc2ec90000'
        },
        chainId: '',
        maxFeePerGas: '',
        maxPriorityFeePerGas: '',
        gasEstimation: undefined
      },
      txHash: '0x55732e30af74a450cd438be2a02c765ea62cb4ec8dda5cb12ed8dc5d21ac15d3',
      txStatus: 0,
      txArgs: [],
      txParams: [],
      txType: 0,
      createdTime: { microseconds: BigInt(0) },
      submittedTime: { microseconds: BigInt(0) },
      confirmedTime: { microseconds: BigInt(0) }
    },
    {
      fromAddress: '0x73A29A1da97149722eB09c526E4eAd698895bDCf',
      id: '13cf4882-d3c0-44cd-a8c2-aca1fcf85c4a',
      txData: {
        baseData: {
          data: Array.from(new Uint8Array(24)),
          gasLimit: '0xfde8',
          gasPrice: '0x20000000000',
          nonce: '0x1',
          to: '0xcd3a3f8e0e4bdc174c9e2e63b4c22e15a7f7f92a',
          value: '0xb1a2bc2ec90000'
        },
        chainId: '',
        maxFeePerGas: '',
        maxPriorityFeePerGas: '',
        gasEstimation: undefined
      },
      txHash: '0x55732e30af74a450cd438be2a02c765ea62cb4ec8dda5cb12ed8dc5d21ac15d3',
      txStatus: 5,
      txArgs: [],
      txParams: [],
      txType: 0,
      createdTime: { microseconds: BigInt(0) },
      submittedTime: { microseconds: BigInt(0) },
      confirmedTime: { microseconds: BigInt(0) }
    }
  ]
}

export const _DesktopWalletConcept = (args: { onboarding: boolean, locked: boolean }) => {
  const {
    onboarding,
    locked
  } = args
  const [view] = React.useState<NavTypes>('crypto')
  const [needsOnboarding, setNeedsOnboarding] = React.useState<boolean>(onboarding)
  const [walletLocked, setWalletLocked] = React.useState<boolean>(locked)
  const [needsBackup, setNeedsBackup] = React.useState<boolean>(true)
  const [showBackup, setShowBackup] = React.useState<boolean>(false)
  const [inputValue, setInputValue] = React.useState<string>('')
  const [hasRestoreError, setHasRestoreError] = React.useState<boolean>(false)
  const [hasPasswordError, setHasPasswordError] = React.useState<boolean>(false)
  const [selectedTimeline, setSelectedTimeline] = React.useState<BraveWallet.AssetPriceTimeframe>(BraveWallet.AssetPriceTimeframe.OneDay)
  const [selectedAssetPriceHistory, setSelectedAssetPriceHistory] = React.useState<PriceDataObjectType[]>(PriceHistoryMockData.slice(15, 20))
  const [selectedAsset, setSelectedAsset] = React.useState<BraveWallet.BlockchainToken>()
  const [selectedNetwork, setSelectedNetwork] = React.useState<BraveWallet.EthereumChain>(mockNetworks[0])
  const [selectedAccount, setSelectedAccount] = React.useState<UserAccountType>(mockUserAccounts[0])
  const [showAddModal, setShowAddModal] = React.useState<boolean>(false)
  const [fromAsset, setFromAsset] = React.useState<BraveWallet.BlockchainToken>(AccountAssetOptions[0])
  const [toAsset, setToAsset] = React.useState<BraveWallet.BlockchainToken>(AccountAssetOptions[1])
  const [orderType, setOrderType] = React.useState<OrderTypes>('market')
  const [exchangeRate, setExchangeRate] = React.useState('0.0027533')
  const [slippageTolerance, setSlippageTolerance] = React.useState<SlippagePresetObjectType>(SlippagePresetOptions[0])
  const [orderExpiration, setOrderExpiration] = React.useState<ExpirationPresetObjectType>(ExpirationPresetOptions[0])
  const [toAddress, setToAddress] = React.useState('')
  const [buyAmount, setBuyAmount] = React.useState('')
  const [sendAmount, setSendAmount] = React.useState('')
  const [fromAmount, setFromAmount] = React.useState('')
  const [toAmount, setToAmount] = React.useState('')
  const [isRestoring, setIsRestoring] = React.useState<boolean>(false)
  const [importAccountError, setImportAccountError] = React.useState<boolean>(false)
  const [importWalletError, setImportWalletError] = React.useState<ImportWalletError>({ hasError: false })
  const [selectedWidgetTab, setSelectedWidgetTab] = React.useState<BuySendSwapTypes>('buy')
  const [customTolerance, setCustomTolerance] = React.useState('')
  const [showVisibleAssetsModal, setShowVisibleAssetsModal] = React.useState<boolean>(false)
  const [foundTokenInfo, setFoundTokenInfo] = React.useState<BraveWallet.BlockchainToken | undefined>()

  const onToggleRestore = () => {
    setIsRestoring(!isRestoring)
  }

  // In the future these will be actual paths
  // for example wallet/rewards
  // const navigateTo = (path: NavTypes) => {
  //   setView(path)
  // }

  const completeWalletSetup = (recoveryVerified: boolean) => {
    setNeedsOnboarding(false)
    setNeedsBackup(recoveryVerified)
  }

  const onWalletBackedUp = () => {
    setNeedsBackup(false)
  }

  const passwordProvided = (password: string) => {
    console.log('Password provided')
  }

  const unlockWallet = () => {
    if (inputValue !== 'password') {
      setHasPasswordError(true)
    } else {
      setWalletLocked(false)
    }
  }

  const lockWallet = () => {
    setWalletLocked(true)
  }

  const handlePasswordChanged = (value: string) => {
    setHasPasswordError(false)
    setInputValue(value)
  }

  const onUpdateAccountName = (): { success: boolean } => {
    return { success: true }
  }

  const onShowBackup = () => {
    setShowBackup(true)
  }

  const onHideBackup = () => {
    setShowBackup(false)
  }

  const onRestore = (phrase: string, password: string, isLegacy: boolean) => {
    if (JSON.stringify(phrase.split(' ')) === JSON.stringify(recoveryPhrase)) {
      completeWalletSetup(true)
    } else {
      setHasRestoreError(true)
    }
  }

  const selectedUSDAssetPrice = React.useMemo(() => {
    if (selectedAsset) {
      const data = CurrentPriceMockData.find((coin) => coin.symbol === selectedAsset.symbol)
      const usdValue = data ? data.usd : '0'
      const usdTimeframeChange = data ? data.usdTimeframeChange : '0'
      const response: BraveWallet.AssetPrice = {
        price: usdValue,
        assetTimeframeChange: usdTimeframeChange,
        fromAsset: '',
        toAsset: ''
      }
      return response
    }
    return undefined
  }, [selectedAsset])

  const selectedBTCAssetPrice = React.useMemo(() => {
    if (selectedAsset) {
      const data = CurrentPriceMockData.find((coin) => coin.symbol === selectedAsset.symbol)
      const btcValue = data ? data.btc : '0'
      const btcTimeframeChange = data ? data.btcTimeframeChange : '0'
      const response: BraveWallet.AssetPrice = {
        price: btcValue,
        assetTimeframeChange: btcTimeframeChange,
        fromAsset: '',
        toAsset: ''
      }
      return response
    }
    return undefined
  }, [selectedAsset])

  // This returns info about a single asset
  const assetInfo = (account: RPCResponseType) => {
    return account.assets.find((a) => a.symbol === selectedAsset?.symbol)
  }

  // This returns the balance of a single accounts asset
  const singleAccountBalance = (account: RPCResponseType) => {
    const balance = assetInfo(account)?.balance
    return balance ? balance.toString() : ''
  }

  const accountInfo = (asset: RPCResponseType) => {
    const foundAccount = mockUserAccounts.find((account) => account.address === asset.address)
    return foundAccount
  }

  // This returns a list of accounts with a balance of the selected asset
  const accounts = React.useMemo(() => {
    const id = selectedAsset ? selectedAsset.symbol : ''
    const list = selectedAsset ? mockRPCResponse.filter((account) => account.assets.map((assetID) => assetID.symbol).includes(id)) : mockRPCResponse
    const newList = list.map((wallet) => {
      const walletInfo = accountInfo(wallet)
      const id = walletInfo ? walletInfo.id : ''
      const name = walletInfo ? walletInfo.name : getLocale('braveWalletAccount')
      return {
        id: id,
        name: name,
        address: wallet.address,
        balance: singleAccountBalance(wallet),
        asset: selectedAsset ? selectedAsset.symbol : '',
        accountType: 'Primary',
        tokenBalanceRegistry: {}
      } as WalletAccountType
    })
    return newList
  }, [selectedAsset, mockRPCResponse])

  // This will scrape all of the user's accounts and combine the balances for a single asset
  const scrapedFullAssetBalance = (asset: BraveWallet.BlockchainToken) => {
    const response = mockRPCResponse
    const amounts = response.map((account) => {
      const balance = account.assets.find((item) => item.id === asset.contractAddress)?.balance
      return balance || 0
    })
    const grandTotal = amounts.reduce(function (a, b) {
      return a + b
    }, 0)
    return grandTotal
  }

  // This will scrape all of the user's accounts and combine the fiat value for a single asset
  const scrapedFullAssetFiatBalance = (asset: BraveWallet.BlockchainToken) => {
    const fullBallance = scrapedFullAssetBalance(asset)
    const price = Number(CurrentPriceMockData.find((coin) => coin.symbol === asset?.symbol)?.usd)
    const value = price ? price * fullBallance : 0
    return value
  }

  const userAssetList = React.useMemo(() => {
    const userList = mockUserWalletPreferences.viewableAssets
    const newList = NewAssetOptions.filter((asset) => userList.includes(asset.contractAddress))
    return newList.map((asset) => {
      return {
        asset: asset,
        assetBalance: scrapedFullAssetBalance(asset).toString()
      }
    })
  }, [mockUserWalletPreferences.viewableAssets])

  // This will scrape all of the user's accounts and combine the fiat value for every asset
  const scrapedFullPortfolioBalance = () => {
    const amountList = userAssetList.map((item) => {
      return scrapedFullAssetFiatBalance(item.asset)
    })
    const grandTotal = amountList.reduce(function (a, b) {
      return a + b
    }, 0)
    return formatWithCommasAndDecimals(grandTotal.toString())
  }

  // This will change once we hit a real api for pricing
  const timeline = (path: BraveWallet.AssetPriceTimeframe) => {
    switch (path) {
      case BraveWallet.AssetPriceTimeframe.Live:
        return 17
      case BraveWallet.AssetPriceTimeframe.OneDay:
        return 15
      case BraveWallet.AssetPriceTimeframe.OneWeek:
        return 12
      case BraveWallet.AssetPriceTimeframe.OneMonth:
        return 10
      case BraveWallet.AssetPriceTimeframe.ThreeMonths:
        return 8
      case BraveWallet.AssetPriceTimeframe.OneYear:
        return 4
      case BraveWallet.AssetPriceTimeframe.All:
        return 0
    }
    return -1
  }

  // This updates the price chart timeline
  const onChangeTimeline = (path: BraveWallet.AssetPriceTimeframe) => {
    setSelectedAssetPriceHistory(PriceHistoryMockData.slice(timeline(path), 20))
    setSelectedTimeline(path)
  }

  const onSelectAsset = (asset: BraveWallet.BlockchainToken) => {
    setSelectedAsset(asset)
  }

  const onCreateAccount = (name: string) => {
    alert(name)
  }

  const onImportAccount = (name: string, key: string) => {
    // doesnt do anything in storybook
  }
  const onImportFilecoinAccount = (accountName: string, privateKey: string, network: string, protocol: BraveWallet.FilecoinAddressProtocol) => {
    // doesnt do anything in storybook
  }

  const onImportAccountFromJson = (name: string, password: string, json: string) => {
    // doesnt do anything in storybook
  }

  const onToggleAddModal = () => {
    setShowAddModal(!showAddModal)
  }

  const onSelectNetwork = (network: BraveWallet.EthereumChain) => {
    setSelectedNetwork(network)
  }

  const onSelectTransactAsset = (asset: BraveWallet.BlockchainToken, toOrFrom: ToOrFromType) => {
    if (toOrFrom === 'from') {
      setFromAsset(asset)
    } else {
      setToAsset(asset)
    }
  }

  const flipSwapAssets = () => {
    setFromAsset(toAsset)
    setToAsset(fromAsset)
  }

  const onSubmitBuy = (asset: BraveWallet.BlockchainToken) => {
    alert(`Buy ${asset.symbol} asset`)
  }

  const onSwapQuoteRefresh = () => {
    console.log('Refreshing swap quote')
  }

  const onSubmitSwap = () => {
    alert('Submit Swap Transaction')
  }

  const onSubmitSend = () => {
    alert('Submit Send Transaction')
  }

  const calculateToAmount = (amount: number, market: boolean) => {
    if (market) {
      const calculated = Number(amount) / Number(exchangeRate)
      setToAmount(calculated.toString())
    } else {
      const calculated = Number(fromAmount) / Number(amount)
      setToAmount(calculated.toString())
    }
  }

  const onToggleOrderType = () => {
    if (orderType === 'market') {
      setOrderType('limit')
    } else {
      setOrderType('market')
      setExchangeRate('0.0027533')
      calculateToAmount(Number('0.0027533'), false)
    }
  }

  const fromAssetBalance = '26'
  const toAssetBalance = '78'

  const onSelectPresetFromAmount = (percent: number) => {
    const amount = Number(fromAssetBalance) * percent
    setFromAmount(amount.toString())
    calculateToAmount(amount, true)
  }

  const onSelectPresetSendAmount = (percent: number) => {
    const amount = Number(fromAssetBalance) * percent
    setSendAmount(amount.toString())
    calculateToAmount(amount, true)
  }

  const onSelectAccount = (account: UserAccountType) => {
    setSelectedAccount(account)
  }

  const onSelectExpiration = (expiration: ExpirationPresetObjectType) => {
    setOrderExpiration(expiration)
  }

  const onSelectSlippageTolerance = (slippage: SlippagePresetObjectType) => {
    setSlippageTolerance(slippage)
    setCustomTolerance('')
  }

  const onSetExchangeRate = (value: string) => {
    setExchangeRate(value)
    calculateToAmount(Number(value), false)
  }

  const onSetBuyAmount = (value: string) => {
    setBuyAmount(value)
  }

  const onSetSendAmount = (value: string) => {
    setSendAmount(value)
  }

  const onSetFromAmount = (value: string) => {
    setFromAmount(value)
    calculateToAmount(Number(value), true)
  }

  const onSetToAmount = (value: string) => {
    setToAmount(value)
  }

  const onSetToAddress = (value: string) => {
    setToAddress(value)
  }

  const onRemoveAccount = () => {
    alert('Will Remove Account')
  }

  const onConnectHardwareWallet = (opts: HardwareWalletConnectOpts): Promise<BraveWallet.HardwareWalletAccount[]> => {
    const makeDerivationPath = (index: number): string => `m/44'/60'/${index}'/0/0`

    return new Promise((resolve) => {
      resolve(Array.from({ length: opts.stopIndex - opts.startIndex }, (_, i) => ({
        address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        derivationPath: makeDerivationPath(i + opts.startIndex),
        name: 'Ledger 1',
        hardwareVendor: 'Ledger',
        deviceId: 'device1',
        coin: BraveWallet.CoinType.ETH
      })))
    })
  }

  const getBalance = (address: string): Promise<string> => {
    return new Promise(async (resolve) => {
      resolve('0')
    })
  }

  const onImportWallet = (password: string) => {
    if (password !== 'password') {
      setImportWalletError({ hasError: true })
    }
  }

  const onAddHardwareAccounts = (accounts: BraveWallet.HardwareWalletAccount[]) => {
    console.log(accounts)
  }

  const onViewPrivateKey = () => {
    // Doesnt do anything in storybook
  }

  const onDoneViewingPrivateKey = () => {
    // Doesnt do anything in storybook
  }

  const onSetImportAccountError = (hasError: boolean) => {
    setImportAccountError(hasError)
  }

  const onSetImportWalletError = (hasError: boolean) => {
    setImportWalletError({ hasError })
  }

  const onAddCustomAsset = () => {
    alert('Will Add a Custom Token')
  }

  const onUpdateVisibleAssets = () => {
    alert('Will Update Visible Assets List')
  }

  const onSetCustomTolerance = (value: string) => {
    setCustomTolerance(value)
  }

  const checkIsStrongPassword = async (value: string) => {
    return isStrongPassword.test(value)
  }

  const defaultCurrencies = {
    fiat: 'USD',
    crypto: 'BTC'
  }

  const onAddNetwork = () => {
    alert('Will redirect to Wallet Network Settings')
  }

  const onShowVisibleAssetsModal = (value: boolean) => {
    setShowVisibleAssetsModal(value)
  }

  const onFindTokenInfoByContractAddress = (contractAddress: string) => {
    const foundToken = NewAssetOptions.find((token) => token.contractAddress.toLowerCase() === contractAddress.toLowerCase())
    setFoundTokenInfo(foundToken)
  }

  return (
    <WalletPageLayout>
      {/* <SideNav
        navList={NavOptions}
        selectedButton={view}
        onSubmit={navigateTo}
      /> */}
      <WalletSubViewLayout>
        {isRestoring ? (
          <OnboardingRestore
            checkIsStrongPassword={checkIsStrongPassword}
            hasRestoreError={hasRestoreError}
            onRestore={onRestore}
            toggleShowRestore={onToggleRestore}
          />
        ) : (
          <>
            {needsOnboarding
              ? (
                <Onboarding
                  checkIsStrongPassword={checkIsStrongPassword}
                  importError={importWalletError}
                  recoveryPhrase={recoveryPhrase}
                  onSubmit={completeWalletSetup}
                  onPasswordProvided={passwordProvided}
                  onShowRestore={onToggleRestore}
                  braveLegacyWalletDetected={true}
                  metaMaskWalletDetected={true}
                  onImportMetaMask={onImportWallet}
                  onImportCryptoWallets={onImportWallet}
                  onSetImportError={onSetImportWalletError}
                />
              ) : (
                <>
                  {view === 'crypto' ? (
                    <>
                      {walletLocked ? (
                        <LockScreen
                          hasPasswordError={hasPasswordError}
                          onSubmit={unlockWallet}
                          disabled={inputValue === ''}
                          onPasswordChanged={handlePasswordChanged}
                          onShowRestore={onToggleRestore}
                        />
                      ) : (
                        <>
                          {showBackup ? (
                            <BackupWallet
                              isOnboarding={false}
                              onCancel={onHideBackup}
                              onSubmit={onWalletBackedUp}
                              recoveryPhrase={recoveryPhrase}
                            />
                          ) : (
                            <CryptoStoryView
                              defaultCurrencies={defaultCurrencies}
                              onLockWallet={lockWallet}
                              needsBackup={needsBackup}
                              onShowBackup={onShowBackup}
                              accounts={accounts}
                              onChangeTimeline={onChangeTimeline}
                              selectedAssetPriceHistory={selectedAssetPriceHistory}
                              selectedTimeline={selectedTimeline}
                              selectedAsset={selectedAsset}
                              fullAssetList={NewAssetOptions}
                              onSelectAsset={onSelectAsset}
                              portfolioPriceHistory={selectedAssetPriceHistory}
                              portfolioBalance={scrapedFullPortfolioBalance()}
                              transactions={transactionDummyData}
                              selectedAssetFiatPrice={selectedUSDAssetPrice}
                              selectedAssetCryptoPrice={selectedBTCAssetPrice}
                              userAssetList={userAssetList}
                              onCreateAccount={onCreateAccount}
                              onImportAccount={onImportAccount}
                              onImportFilecoinAccount={onImportFilecoinAccount}
                              onConnectHardwareWallet={onConnectHardwareWallet}
                              onAddHardwareAccounts={onAddHardwareAccounts}
                              getBalance={getBalance}
                              isLoading={false}
                              showAddModal={showAddModal}
                              onToggleAddModal={onToggleAddModal}
                              onUpdateAccountName={onUpdateAccountName}
                              selectedNetwork={selectedNetwork}
                              onSelectNetwork={onSelectNetwork}
                              isFetchingPortfolioPriceHistory={false}
                              selectedPortfolioTimeline={selectedTimeline}
                              onRemoveAccount={onRemoveAccount}
                              privateKey='gf65a4g6a54fg6a54fg6ad4fa5df65a4d6ff54a6sdf'
                              onDoneViewingPrivateKey={onDoneViewingPrivateKey}
                              onViewPrivateKey={onViewPrivateKey}
                              networkList={mockNetworks}
                              onImportAccountFromJson={onImportAccountFromJson}
                              hasImportError={importAccountError}
                              onSetImportError={onSetImportAccountError}
                              onAddCustomAsset={onAddCustomAsset}
                              onUpdateVisibleAssets={onUpdateVisibleAssets}
                              transactionSpotPrices={[]}
                              userVisibleTokensInfo={[]}
                              onShowVisibleAssetsModal={onShowVisibleAssetsModal}
                              showVisibleAssetsModal={showVisibleAssetsModal}
                              onFindTokenInfoByContractAddress={onFindTokenInfoByContractAddress}
                              foundTokenInfoByContractAddress={foundTokenInfo}
                            />
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <div style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <h2>{view} view</h2>
                    </div>
                  )}
                </>
              )}
          </>
        )}

      </WalletSubViewLayout>
      {!needsOnboarding && !walletLocked &&
        <WalletWidgetStandIn>
          <BuySendSwap
            defaultCurrencies={defaultCurrencies}
            orderType={orderType}
            swapToAsset={toAsset}
            exchangeRate={exchangeRate}
            orderExpiration={orderExpiration}
            slippageTolerance={slippageTolerance}
            swapFromAsset={fromAsset}
            accounts={mockUserAccounts}
            selectedNetwork={selectedNetwork}
            selectedAccount={selectedAccount}
            selectedTab={selectedWidgetTab}
            buyAmount={buyAmount}
            sendAmount={sendAmount}
            fromAmount={fromAmount}
            toAmount={toAmount}
            selectedSendAsset={fromAsset}
            sendAssetBalance={fromAssetBalance}
            fromAssetBalance={fromAssetBalance}
            toAssetBalance={toAssetBalance}
            toAddressOrUrl={toAddress}
            toAddress={toAddress}
            addressError=''
            addressWarning=''
            isFetchingSwapQuote={false}
            isSwapSubmitDisabled={false}
            customSlippageTolerance={customTolerance}
            onCustomSlippageToleranceChange={onSetCustomTolerance}
            onSubmitBuy={onSubmitBuy}
            onSetBuyAmount={onSetBuyAmount}
            onSetSendAmount={onSetSendAmount}
            onSetToAddressOrUrl={onSetToAddress}
            onSetFromAmount={onSetFromAmount}
            onSetToAmount={onSetToAmount}
            onSubmitSend={onSubmitSend}
            onSubmitSwap={onSubmitSwap}
            flipSwapAssets={flipSwapAssets}
            onSelectNetwork={onSelectNetwork}
            onSelectAccount={onSelectAccount}
            onToggleOrderType={onToggleOrderType}
            onSelectAsset={onSelectTransactAsset}
            onSelectExpiration={onSelectExpiration}
            onSetExchangeRate={onSetExchangeRate}
            onSelectSlippageTolerance={onSelectSlippageTolerance}
            onSelectPresetFromAmount={onSelectPresetFromAmount}
            onSelectPresetSendAmount={onSelectPresetSendAmount}
            onSelectTab={setSelectedWidgetTab}
            buyAssetOptions={AccountAssetOptions}
            sendAssetOptions={AccountAssetOptions}
            swapAssetOptions={AccountAssetOptions}
            networkList={mockNetworks}
            onSwapQuoteRefresh={onSwapQuoteRefresh}
            onSelectSendAsset={onSelectTransactAsset}
            onAddNetwork={onAddNetwork}
            onAddAsset={onShowVisibleAssetsModal}
          />
        </WalletWidgetStandIn>
      }
    </WalletPageLayout>
  )
}

_DesktopWalletConcept.args = {
  onboarding: false,
  locked: false
}

_DesktopWalletConcept.story = {
  name: 'Concept'
}
