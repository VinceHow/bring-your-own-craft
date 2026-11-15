# Pending: design polish (hand edit 5), awaiting the design lead's yes

Not deployed. Railway watches `deploy/app/**`, so the polish is parked here until it's approved.
To apply: `git apply deploy/polish-pending/polish.diff` (or copy `public/*` and `BUILT.md` into `deploy/app/`), commit, push.
Checked locally on the applied version: gate 18 passed, 1 skipped; name-once and delivered browser checks pass; Bo's tests 27/27.
