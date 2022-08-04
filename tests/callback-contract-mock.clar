(define-constant err-cant-unwrap (err u1000))

(define-public (post-create-dlc-handler (nonce uint) (uuid (buff 8)))
    (begin
        (print { uuid: uuid, nonce: nonce })
        (ok true)
    )
)
(define-public (create-dlc-request (asset (buff 32)) (strike-price uint) (closing-time uint) (emergency-refund-time uint))
  (let ((target .callback-contract)) 
    (unwrap! (ok (as-contract (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-pricefeed-v1-02 create-dlc asset strike-price closing-time emergency-refund-time target u1))) err-cant-unwrap)
  )
)
