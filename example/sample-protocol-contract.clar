
;; sample-protocol-contract
;; Sample protocol contract for using DLC.Link.
;; This contract is a sample representing a protocol that would call into the DLC.Link management contract
;; It borrows from the Clarity trait to
;; - Open the dlc
;; - Accept the callback and store the returned UUID
;; - Close the DLC

(use-trait cb-trait .dlc-link-callback-trait.dlc-link-callback-trait)
(impl-trait .dlc-link-callback-trait.dlc-link-callback-trait)

;; Error constants
(define-constant err-cant-unwrap (err u1000))
(define-constant err-contract-call-failed (err u1001))
(define-constant err-unauthorised (err u2001))
(define-constant err-unknown-user-contract (err u2003))
(define-constant err-doesnt-need-liquidation (err u2004))

;; Contract owner
(define-constant contract-owner tx-sender)

;; Contract name bindings
(define-constant sample-protocol-contract .sample-protocol-contract)

;; A map to store "usercontracts": information about a DLC
(define-map usercontracts
  uint
  {
    dlc_uuid: (optional (buff 8)),
    user-id: uint,
    ;; Other data about the user and their specific contract
    active: bool,
    vault-loan: uint, ;; the borrowed amount
    vault-collateral: uint, ;; btc deposit in sats
    liquidation-ratio: uint,
    liquidation-fee: uint,
    closing-price: uint
  }
)

;; A map to link uuids and user-ids
(define-map uuid-user-id 
  (buff 8) 
  uint
)

(define-read-only (get-usercontract (user-id uint)) 
  (map-get? usercontracts user-id)
)

(define-read-only (get-user-id-by-uuid (uuid (buff 8)))
  (map-get? uuid-user-id uuid)
)

;; An auto-incrementing user-id will be used to know which incoming uuid is connected to which usercontract
(define-data-var last-user-id uint u0)

(define-read-only (get-last-user-id) 
  (ok (var-get last-user-id))
)

;; An example function to initiate the creation of a DLC usercontract.
;; - Increments the user-id
;; - Calls the dlc-manager-contract's create-dlc function to initiate the creation
;; The DLC Contract will call back into the provided 'target' contract with the resulting UUID (and the provided user-id).
;; Currently this 'target' must be the same contract as the one initiating the process, for authentication purposes.
;; See scripts/setup-user-contract.ts for an example of calling it.
(define-public (setup-user-contract (vault-loan-amount uint) (btc-deposit uint) (liquidation-ratio uint) (liquidation-fee uint) (emergency-refund-time uint))
    (let 
      (
        (user-id (+ (var-get last-user-id) u1)) 
        (target sample-protocol-contract)
      )
      (var-set last-user-id user-id)
      (begin
          (map-set usercontracts user-id {
            dlc_uuid: none,
            user-id: user-id,
            active: false,
            vault-loan: vault-loan-amount,
            vault-collateral: btc-deposit,
            liquidation-ratio: liquidation-ratio,
            liquidation-fee: liquidation-fee,
            closing-price: u0
          })
          (unwrap! (ok (as-contract (contract-call? .dlc-manager-pricefeed-v2-01 create-dlc vault-loan-amount btc-deposit liquidation-ratio liquidation-fee emergency-refund-time target user-id))) err-contract-call-failed)
      )
    )
)


;; implemented from the trait, this is what is used to pass back the uuid created by the DLC system
(define-public (post-create-dlc-handler (user-id uint) (uuid (buff 8)))
    (begin
        (print { uuid: uuid, user-id: user-id })
        (map-set usercontracts user-id (
            merge (unwrap! (map-get? usercontracts user-id) err-unknown-user-contract ) {
            dlc_uuid: (some uuid),
            user-id: user-id,
            active: true
        }))
        (map-set uuid-user-id uuid user-id)
        (ok true)
    )
)

;; An example function for initiating the closing of a DLC.
;; Very similar to the creation process
;; See scripts/close-dlc-protocol.ts for an example of calling it.
(define-public (close-dlc (user-id uint)) 
  (let (
    (usercontract (unwrap! (get-usercontract user-id) err-unknown-user-contract))
    (uuid (unwrap! (get dlc_uuid usercontract) err-cant-unwrap))
    )
    (asserts! (is-eq contract-owner tx-sender)  err-unauthorised)
    (begin
      (unwrap! (ok (as-contract (contract-call? .dlc-manager-pricefeed-v2-01 close-dlc uuid))) err-contract-call-failed)
    )
  )
)

(define-public (close-dlc-liquidate (user-id uint) (btc-price uint)) 
  (let (
    (usercontract (unwrap! (get-usercontract user-id) err-unknown-user-contract))
    (uuid (unwrap! (get dlc_uuid usercontract) err-cant-unwrap))
    ) 
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (asserts! (unwrap! (check-liquidation uuid btc-price) err-cant-unwrap) err-doesnt-need-liquidation)
    (begin
      (unwrap! (ok (as-contract (contract-call? .dlc-manager-pricefeed-v2-01 close-dlc-liquidate uuid))) err-contract-call-failed)
    )
  )
)

(define-private (check-liquidation (uuid (buff 8)) (btc-price uint))
  (let (
    ) 
    (begin (unwrap! (ok (as-contract (contract-call? .dlc-manager-pricefeed-v2-01 check-liquidation uuid btc-price))) err-contract-call-failed)
    )
  )
)

;; Implemented from the trait
(define-public (post-close-dlc-handler (uuid (buff 8)) (closing-price uint))
  (let (
    (user-id (unwrap! (get-user-id-by-uuid uuid ) err-cant-unwrap ))
    (usercontract (unwrap! (get-usercontract user-id) err-unknown-user-contract))
    )
    (begin 
      (map-set usercontracts user-id (merge usercontract { active: false, closing-price: closing-price })) 
    )
    (ok true)
  )
)
