# Sellpia Collection Contract - 2026-06-30

This document is the rebuild baseline for data collected from Sellpia stock
matching. The picking tab can keep its current UI behavior, but it should read
through this contract instead of raw Sellpia/DB column names.

## Entity Keys

| Data | Scope | Standard name | Current source/DB names | Rule |
| --- | --- | --- | --- | --- |
| 주문그룹No | invoice/order group | `orderGroupNo` | `c_group_no`, `ord_no` fallback | Main invoice-like business group key. Do not show in frontend by default. |
| *주문품목No | item | `sellpiaItemNo` | `c_prv_item_no`, `item_no` | Main item key for toggle CSV and item-level matching. |
| 송장번호 | invoice/order group | `invoiceNo` | `c_delinum`, `inv_no`, `dnum` | Search/barcode key. Not the primary data identity. |

## Invoice-Level Fields

| Data | Standard name | Current source/DB names | UI usage | Edit/sync |
| --- | --- | --- | --- | --- |
| 수취인명 | `recipientName` | `c_receiver`, `receiver`, `receiver_name` | All tabs except CS as main visible name | Read |
| 주문자명 | `buyerName` | `c_orderer`, `orderer`, `buyer` | Show as `recipientName(buyerName)` only when different. CS tab shows buyer name. | Read |
| 관리메모 | `sellpiaMemo1` | `c_shop_memo`, `o_shop_memo` | Drawer number, CS memo, hold reason | Editable, must sync to Sellpia |
| 판매처 | `seller` | `c_provider_name`, `seller` | Gift and Kakao template criteria | Read |
| 수취인연락처 | `recipientPhone` | receiver tel/mobile fields | CS/alert template | Read |
| 주문자연락처 | `buyerPhone` | orderer tel/mobile fields | CS/alert fallback | Read |
| 주문총금액 | `orderTotalAmount` | Sellpia order total amount column, `sellpia_order_total_amount` | Gift criteria. Use this column directly, not item sum. | Read |
| 접수일자 | `receiptDate` | selected collect date, `ord_date` | Picking date/session 기준 | Read |
| 주문메모 | `orderMemo` | `c_ord_memo`, `order_memo` | Shortage picking, inspection, CS shared note | Editable after workflow decision |

## Item-Level Fields

| Data | Standard name | Current source/DB names | UI usage | Edit/sync |
| --- | --- | --- | --- | --- |
| 관리메모2 | `sellpiaMemo2` | `c_shop_memo2`, `o_shop_memo2` | Inspector/shortage picking confirmation | Editable item memo |
| 자사코드 | `ownCode` | `c_dp_code`, `prod_code`, `p_dpcode` | Picking/inspection/shortage location and product identity | Read |
| 상품코드 | `sellpiaProductCode` | `c_p_code`, `p_code` | Product image filename and Sellpia product identity | Read |
| 상품명(셀) | `productName` | `c_prd_name`, `p_name` | Secondary display text | Read |
| 옵션명(셀) | `optionName` | `c_opt_name`, `p_option` | Primary picking display text | Read |
| 품목판매금액 | `itemSalesAmount` | item sales amount column, `sellpia_item_sales_amount` | Item-level reference only. Do not replace order total. | Read |
| 상품위치(셀) | `sellpiaLocation` | `c_location`, `p_location` | 낱/한쌍 and location helper | Read |
| 송장 안 상품순서 | `itemOrderIndex` | parsed from `sellpiaItemNo` suffix or `sort_order` | Keep internal invoice item order, especially gold/add-on products | Read |

## Display Rules

| Case | Rule |
| --- | --- |
| Recipient and buyer are same | Show `recipientName`. |
| Recipient and buyer are different | Show `recipientName(buyerName)`. |
| CS tab | Show `buyerName` as primary name. |
| Barcode search | Search by `invoiceNo`. |
| Data identity | Use `orderGroupNo` + `sellpiaItemNo`; use `invoiceNo` only as searchable delivery key. |
| Gift criteria | Use `orderTotalAmount` from Sellpia order total column. Do not calculate by summing item sales. |

## Picking Tab Migration Rule

The picking tab should be migrated by keeping the current UI behavior and
replacing only its data entry point:

1. Read raw current DB rows.
2. Convert them through `src/adapters/currentDbPickingAdapter.mjs`.
3. Render with the existing picking UI logic using the normalized picking view
   model.
4. Convert saves back to current DB column names only at the adapter boundary.
