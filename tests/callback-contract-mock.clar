(define-constant err-cant-unwrap (err u1000))

(define-public (post-create-dlc-handler (nonce uint) (uuid (buff 8)))
    (begin
        (print { uuid: uuid, nonce: nonce, event-source: "callback-mock-post-create" })
        (ok true)
    )
)

(define-public (post-close-dlc-handler (uuid (buff 8)) (closing-price uint)) 
    (begin
        (print { uuid: uuid, closing-price: closing-price, event-source: "callback-mock-post-close" })
        (ok true)
    )
)

(define-public (create-dlc-request (vault-loan-amount uint) (btc-deposit uint) (liquidation-ratio uint) (liquidation-fee uint) (emergency-refund-time uint))
  (let ((target .callback-contract)) 
    (unwrap! (ok (as-contract (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-pricefeed-v2-01 create-dlc vault-loan-amount btc-deposit liquidation-ratio liquidation-fee emergency-refund-time target u1))) err-cant-unwrap)
  )
)
