# Adapters

Adapters convert external names into the internal domain model.

Planned adapters:

- Supabase current DB adapter: `currentDbPickingAdapter.mjs`
- Workflow event read adapter: `workflowEventAdapter.mjs`
- Sellpia grid row adapter
- Sellpia memo updater adapter
- Label export adapter
- Product image storage adapter

The DB can stay unchanged while code uses stable internal names.

`workflowEventAdapter.mjs` intentionally does not start from the selected UI
date. It loads workflow events, derives the affected `order_group_no` values,
then hydrates original `orders` and `order_items` for shortage picking and
inspection queues.
