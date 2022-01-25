/* Copyright (c) 2021 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.chromium.chrome.browser.crypto_wallet.fragments;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.method.LinkMovementMethod;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentTransaction;

import com.google.android.material.bottomsheet.BottomSheetDialogFragment;

import org.chromium.base.Log;
import org.chromium.chrome.R;
import org.chromium.chrome.browser.crypto_wallet.activities.BuySendSwapActivity;
import org.chromium.chrome.browser.crypto_wallet.util.Utils;
import org.chromium.chrome.browser.util.TabUtils;
import org.chromium.ui.text.NoUnderlineClickableSpan;

public class SwapBottomSheetDialogFragment
        extends BottomSheetDialogFragment implements View.OnClickListener {
    public static final String TAG_FRAGMENT = SwapBottomSheetDialogFragment.class.getName();
    private LinearLayout mBuyLayout;
    private LinearLayout mSendLayout;
    private LinearLayout mSwapLayout;
    private String mChainId;

    public static SwapBottomSheetDialogFragment newInstance() {
        return new SwapBottomSheetDialogFragment();
    }

    public void setChainId(String chainId) {
        mChainId = chainId;
    }

    @Override
    public void show(FragmentManager manager, String tag) {
        try {
            SwapBottomSheetDialogFragment fragment =
                    (SwapBottomSheetDialogFragment) manager.findFragmentByTag(
                            SwapBottomSheetDialogFragment.TAG_FRAGMENT);
            FragmentTransaction transaction = manager.beginTransaction();
            if (fragment != null) {
                transaction.remove(fragment);
            }
            transaction.add(this, tag);
            transaction.commitAllowingStateLoss();
        } catch (IllegalStateException e) {
            Log.e("SwapBottomSheetDialogFragment", e.getMessage());
        }
    }

    @Override
    public void setupDialog(@NonNull Dialog dialog, int style) {
        super.setupDialog(dialog, style);

        @SuppressLint("InflateParams")
        final View view =
                LayoutInflater.from(getContext()).inflate(R.layout.swap_bottom_sheet, null);

        mBuyLayout = view.findViewById(R.id.buy_layout);
        mBuyLayout.setOnClickListener(this);
        mSendLayout = view.findViewById(R.id.send_layout);
        mSendLayout.setOnClickListener(this);
        mSwapLayout = view.findViewById(R.id.swap_layout);
        mSwapLayout.setOnClickListener(this);
        assert mChainId != null;
        if (!Utils.isCustomNetwork(mChainId)) {
            mBuyLayout.setVisibility(View.VISIBLE);
            mSwapLayout.setVisibility(View.VISIBLE);
            TextView tvSwapDexAggregator = mSwapLayout.findViewById(R.id.tx_swap_dex_aggregator_text);
            tvSwapDexAggregator.setMovementMethod(LinkMovementMethod.getInstance());

            String dexAggregator = getContext().getString(R.string.swap_dex_aggregator_text);
            String degAggregatorText =
                    String.format(getContext().getString(R.string.swap_text), dexAggregator);

            NoUnderlineClickableSpan span = new NoUnderlineClickableSpan(
                    getResources(), R.color.brave_action_color, (textView) -> {
                        TabUtils.openUrlInNewTab(false, Utils.DEX_AGGREGATOR_URL);
                        TabUtils.bringChromeTabbedActivityToTheTop(requireActivity());
                    });

            SpannableString dexAggregatorSpanStr = Utils.createSpannableString(
                    degAggregatorText, dexAggregator, span, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            tvSwapDexAggregator.setText(dexAggregatorSpanStr);
        } else {
            mBuyLayout.setVisibility(View.GONE);
            mSwapLayout.setVisibility(View.GONE);
        }

        dialog.setContentView(view);
        ViewParent parent = view.getParent();
        ((View) parent).getLayoutParams().height = ViewGroup.LayoutParams.WRAP_CONTENT;
    }

    @Override
    public void onClick(View view) {
        BuySendSwapActivity.ActivityType activityType = BuySendSwapActivity.ActivityType.BUY;
        if (view == mSendLayout) {
            activityType = BuySendSwapActivity.ActivityType.SEND;
        } else if (view == mSwapLayout) {
            activityType = BuySendSwapActivity.ActivityType.SWAP;
        }
        Utils.openBuySendSwapActivity(getActivity(), activityType);
        dismiss();
    }
}
