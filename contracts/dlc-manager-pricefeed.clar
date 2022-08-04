;;ERROR CODES
(define-constant err-not-contract-owner (err u100))
(define-constant err-untrusted-oracle (err u101))
(define-constant err-stale-data (err u102))
(define-constant err-unauthorised (err u2001))
(define-constant err-dlc-already-added (err u2002))
(define-constant err-unknown-dlc (err u2003))
(define-constant err-not-reached-closing-time (err u2004))
(define-constant err-already-closed (err u2005))
(define-constant err-already-passed-closing-time (err u2006))
(define-constant err-not-closed (err u2007))
(define-constant err-not-the-same-assets (err u2008))

;; Contract owner
(define-constant contract-owner tx-sender)

;; Current contract's name
(define-constant dlc-manager-contract .dlc-manager-pricefeed-v1-02)

;; Importing the trait to use it as a type
(use-trait cb-trait .dlc-create-callback-trait.dlc-create-callback-trait)

;; A map of all trusted oracles, indexed by their 33 byte compressed public key.
(define-map trusted-oracles (buff 33) bool)

;; NFT to keep track of the open dlcs easily
(define-non-fungible-token open-dlc (buff 8))

;; NFT to keep track of registered contracts
(define-non-fungible-token registered-contract principal)

(define-map dlcs
  (buff 8)
  {
    uuid: (buff 8),
    asset: (buff 32),
    closing-time: uint,  ;;seconds because stacks block has the timestamp in seconds
    closing-price: (optional uint), ;; none means it is still open
    actual-closing-time: uint,
    emergency-refund-time: uint,
    creator: principal
  })

(define-read-only (get-last-block-timestamp)
  (default-to u0 (get-block-info? time (- block-height u1))))

(define-read-only (get-dlc (uuid (buff 8)))
  (map-get? dlcs uuid))

;;emits an event - see README for more details
;;asset: the ticker symbol for the asset that will be used to closing price data, e.g. 'btc' (https://github.com/redstone-finance/redstone-api/blob/main/docs/ALL_SUPPORTED_TOKENS.md)
;;strike-price: the over/under price for the DLC bet
;;closing-time: the UTC time in seconds after which the contract can be closed
;;emergency-refund-time: the time at which the DLC will be available for refund
;;callback-contract: the contract-principal where the create-dlc-internal will call back to
;;nonce provided for the dlc by the sample-protocol-contract to connect it to the resulting uuid
(define-public (create-dlc (asset (buff 32)) (strike-price uint) (closing-time uint) (emergency-refund-time uint) (callback-contract principal) (nonce uint))
  (begin 
    (asserts! (is-eq callback-contract tx-sender) err-unauthorised)
    (print {
      asset: asset, 
      strike-price: strike-price,
      closing-time: closing-time, 
      emergency-refund-time: emergency-refund-time,
      creator: tx-sender,
      callback-contract: callback-contract,
      nonce: nonce,
      event-source: "dlclink:create-dlc:v1" })
      (ok true)
    ))

;;opens a new dlc - called by the DLC Oracle system
(define-public (create-dlc-internal (uuid (buff 8)) (asset (buff 32)) (closing-time uint) (emergency-refund-time uint) (creator principal) (callback-contract <cb-trait>) (nonce uint))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (asserts! (is-none (map-get? dlcs uuid)) err-dlc-already-added)
    (map-set dlcs uuid {
      uuid: uuid, 
      asset: asset, 
      closing-time: closing-time, 
      closing-price: none, 
      actual-closing-time: u0, 
      emergency-refund-time: emergency-refund-time,
      creator: creator })
    (print {
      uuid: uuid, 
      asset: asset, 
      closing-time: closing-time,
      emergency-refund-time: emergency-refund-time,
      creator: creator,
      event-source: "dlclink:create-dlc-internal:v1" })
    (try! (contract-call? callback-contract post-create-dlc-handler nonce uuid))
    (nft-mint? open-dlc uuid dlc-manager-contract))) ;;mint an open-dlc nft to keep track of open dlcs

;; External close-dlc request
(define-public (close-dlc (uuid (buff 8)))
  (let (
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    (block-timestamp (get-last-block-timestamp))
    )
    (asserts! (or (is-eq contract-owner tx-sender) (is-eq (get creator dlc) tx-sender)) err-unauthorised)
    (asserts! (is-none (get closing-price dlc)) err-already-closed)
    (asserts! (>= block-timestamp (get closing-time dlc)) err-not-reached-closing-time)
    (print { 
      uuid: uuid, 
      asset: (get asset dlc),
      closing-time: (get closing-time dlc),
      event-source: "dlclink:close-dlc:v1"
      })
    (ok true)
  ))

;; Early close request -- admin only
(define-public (early-close-dlc (uuid (buff 8))) 
  (let (
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    )
    (asserts! (is-none (get closing-price dlc)) err-already-closed)
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (print { 
      uuid: uuid, 
      asset: (get asset dlc) ,
      closing-time: (get closing-time dlc),
      event-source: "dlclink:early-close-dlc:v1" 
      })
    (ok true)
  ))

;;Close the dlc with the oracle data. This is called by the DLC Oracle service
(define-public (close-dlc-internal (uuid (buff 8)) (timestamp uint) (entries (list 10 {symbol: (buff 32), value: uint})) (signature (buff 65)))
  (let (
    ;; Recover the pubkey of the signer.
    (signer (try! (contract-call? 'STDBEG5X8XD50SPM1JJH0E5CTXGDV5NJTJTTH7YB.redstone-verify recover-signer timestamp entries signature)))
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    (block-timestamp (get-last-block-timestamp))
    )
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    ;; Check if the signer is a trusted oracle.
    (asserts! (is-trusted-oracle signer) err-untrusted-oracle)
    ;; Check if the data is not stale, depending on how the app is designed.
    (asserts! (> timestamp block-timestamp) err-stale-data) ;; timestamp should be larger than the last block timestamp.
    ;;DLC related checks
    (asserts! (is-eq (unwrap-panic (get symbol (element-at entries u0))) (get asset dlc)) err-not-the-same-assets) ;;check if the submitted asset is the same what was logged in the DLC
    (asserts! (is-none (get closing-price dlc)) err-already-closed)
    (map-set dlcs uuid (merge dlc { closing-price: (get value (element-at entries u0)), actual-closing-time: (/ timestamp u1000) })) ;;timestamp is in milliseconds so we have to convert it to seconds to keep the timestamps consistent
    (print {
      uuid: uuid,
      closing-price: (get value (element-at entries u0)),
      actual-closing-time: (/ timestamp u1000),
      event-source: "dlclink:close-dlc-internal:v1" })
    (nft-burn? open-dlc uuid dlc-manager-contract))) ;;burn the open-dlc nft related to the UUID

;; get the closing price of the DLC by UUID
(define-read-only (get-dlc-closing-price-and-time (uuid (buff 8)))
(let (
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    )
    (asserts! (is-some (get closing-price dlc)) err-not-closed)
    (ok {
      closing-price: (get closing-price dlc),
      closing-time: (get closing-time dlc)
    })))


(define-read-only (is-trusted-oracle (pubkey (buff 33)))
  (default-to false (map-get? trusted-oracles pubkey))
)

;; #[allow(unchecked_data)]
(define-public (set-trusted-oracle (pubkey (buff 33)) (trusted bool))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-not-contract-owner)
    (ok (map-set trusted-oracles pubkey trusted))
  )
)

;; Admin function to register a protocol/user-contract
;; This is picked up by the Observer infrastructure to start listening to contract-calls of our public functions.
(define-public (register-contract (contract-address <cb-trait>))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-not-contract-owner)
    (print { 
      contract-address: contract-address,
      event-source: "dlclink:register-contract:v1" })
    (nft-mint? registered-contract (contract-of contract-address) dlc-manager-contract)
  )
)

(define-public (unregister-contract (contract-address <cb-trait>))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-not-contract-owner)
    (print { 
      contract-address: contract-address,
      event-source: "dlclink:unregister-contract:v1" })
    (nft-burn? registered-contract (contract-of contract-address) dlc-manager-contract)
  )
)

(define-read-only (is-contract-registered (contract-address principal))
  (is-some (nft-get-owner? registered-contract contract-address))
)