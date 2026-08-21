# Sample accounts

Real accounts in MongoDB, created by `backend/scripts/seedAccounts.js`. They are
**logins, not demo content** — the app itself no longer seeds anything. An empty
dispatch queue means an empty dispatch queue, and every pickup request in the
system was raised by one of these farmers against a mandi deal they agreed.

```bash
node backend/scripts/seedAccounts.js     # idempotent — safe to re-run
```

Existing accounts are left untouched, including their passwords. Re-running only
fills in what is missing.

**Password for every account below: `krishi@2026`**

---

## Farmers

Raise pickup requests. Each has a real farm coordinate, because a request we
cannot locate cannot be ranked and will not be given a guessed position.

| Name | Email | Phone | Farm | Coordinates |
| --- | --- | --- | --- | --- |
| Ramesh Singh | `ramesh.farmer@krishiflow.ai` | +91 98765 43210 | Nashik Central Farm HQ | 73.7898, 19.9975 |
| Kiran Thorat | `kiran.farmer@krishiflow.ai` | +91 94211 77665 | Lasalgaon, Niphad | 74.2400, 20.1400 |
| Anand Kulkarni | `anand.farmer@krishiflow.ai` | +91 94220 99881 | Pimpalgaon Baswant | 73.9850, 20.1750 |
| Savita Pawar | `savita.farmer@krishiflow.ai` | +91 99204 31188 | Junnar block, Pune | 73.8750, 19.2090 |

## Fleet owners

Own the vehicles and run Dispatch. There is **no driver login** — a driver is a
name and a phone number on a truck.

### Vikram Jadhav — Sahyadri Transport, Nashik
`vikram.fleet@krishiflow.ai` · +91 98600 12345

| Vehicle | Driver | Type | Capacity | Rate | Cold | Base |
| --- | --- | --- | --- | --- | --- | --- |
| MH 15 GH 4921 | Suresh Shinde | Refrigerated Van | 3,500 kg | ₹52/km | yes | Nashik APMC Hub |
| MH 31 CB 7810 | Sunita Patil | Heavy Freighter | 10,000 kg | ₹78/km | yes | Nashik depot |
| MH 15 DK 2204 | Balu Wagh | Mini Truck | 2,000 kg | ₹38/km | no | Pimpalgaon Baswant |

### Farida Shaikh — Deccan Carriers, Pune
`farida.fleet@krishiflow.ai` · +91 97300 88221

| Vehicle | Driver | Type | Capacity | Rate | Cold | Base |
| --- | --- | --- | --- | --- | --- | --- |
| MH 12 AB 9910 | Aniket Deshmukh | E-Pickup | 1,500 kg | ₹34/km | no | Pune depot |
| MH 12 QR 6633 | Imran Sayyad | Refrigerated Van | 4,000 kg | ₹58/km | yes | Gultekdi APMC, Pune |

The two fleets are deliberately different in shape. A lot bound for Mumbai APMC
should cost Sahyadri far less than Deccan, and the dispatch screen shows exactly
why — down to the individual legs added and dropped.

## Buyer

| Name | Email | Phone | Mandi |
| --- | --- | --- | --- |
| Rajesh Mehta | `rajesh.buyer@krishiflow.ai` | +91 98200 55443 | Mumbai APMC, Vashi |

---

## Walking the whole loop

1. **Farmer** (`kiran.farmer@krishiflow.ai`) → Price → pick a mandi → Vehicle
   tab → agree a rate with the trader → **Ask for a pickup**. No truck is
   chosen here; that is the fleet owner's decision.
2. **Fleet owner** (`vikram.fleet@krishiflow.ai`) → Dispatch. The request is in
   the queue, ranked against Vikram's three trucks by the extra road km each
   would need. Open *show the working* to see the legs. Approve one.
3. **Both** → Tracking. The farmer now sees which truck and driver is coming;
   the fleet owner moves the job through collected → in transit → delivered.

Sign in as `farida.fleet@krishiflow.ai` at step 2 instead to see the same
request ranked against a Pune fleet — same arithmetic, much worse numbers. Both
fleets see every pending request, and the first to approve gets it.
