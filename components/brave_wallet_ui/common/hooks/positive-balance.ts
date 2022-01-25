import * as React from 'react'
import { BraveWallet, WalletAccountType } from 'components/brave_wallet_ui/constants/types'
import { useBalance } from '.'

export default function usePositiveBalance (
  selectedNetwork: BraveWallet.EthereumChain,
  assetOptions: BraveWallet.BlockchainToken[],
  selectedAccount: WalletAccountType
) {
  const getBalance = useBalance(selectedNetwork)

  return React.useCallback(() => {
    return assetOptions.filter(assetOption => {
      const balance = getBalance(selectedAccount, assetOption)
      return parseFloat(balance) > 0
    })
  }, [selectedNetwork, assetOptions, selectedAccount])
}
