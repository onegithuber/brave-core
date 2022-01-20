/* Copyright (c) 2020 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef BRAVE_IOS_APP_BRAVE_CORE_MAIN_H_
#define BRAVE_IOS_APP_BRAVE_CORE_MAIN_H_

#import <Foundation/Foundation.h>

@class BraveBookmarksAPI;
@class BraveHistoryAPI;
@class BravePasswordAPI;
@class BraveSyncAPI;
@class BraveSyncProfileServiceIOS;
@protocol BraveWalletBlockchainRegistry;
@protocol BraveWalletBraveWalletProvider;
@protocol BraveWalletProviderDelegate;

NS_ASSUME_NONNULL_BEGIN

typedef bool (^BraveCoreLogHandler)(int severity,
                                    NSString* file,
                                    int line,
                                    size_t messageStart,
                                    NSString* formattedMessage);

OBJC_EXPORT
@interface BraveCoreMain : NSObject

@property(nonatomic, readonly) BraveBookmarksAPI* bookmarksAPI;

@property(nonatomic, readonly) BraveHistoryAPI* historyAPI;

@property(nonatomic, readonly) BraveSyncAPI* syncAPI;

@property(nonatomic, readonly) BraveSyncProfileServiceIOS* syncProfileService;

@property(nonatomic, readonly) BravePasswordAPI* passwordAPI;

+ (void)setLogHandler:(nullable BraveCoreLogHandler)logHandler;

- (instancetype)init NS_UNAVAILABLE;

- (instancetype)initWithUserAgent:(NSString*)userAgent;

- (instancetype)initWithUserAgent:(NSString*)userAgent
                   syncServiceURL:(NSString*)syncServiceURL;

- (void)scheduleLowPriorityStartupTasks;

@property(class, readonly) id<BraveWalletBlockchainRegistry> blockchainRegistry;

- (nullable id<BraveWalletBraveWalletProvider>)
    walletProviderWithDelegate:(id<BraveWalletProviderDelegate>)delegate
             isPrivateBrowsing:(bool)isPrivateBrowsing;

@end

NS_ASSUME_NONNULL_END

#endif  // BRAVE_IOS_APP_BRAVE_CORE_MAIN_H_
