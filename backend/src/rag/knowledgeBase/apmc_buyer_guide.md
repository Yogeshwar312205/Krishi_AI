---
documentId: apmc-buyer-guide
title: KrishiFlow APMC Buyer Workflow & Agreed Deals Guide
source: krishiflow-docs
url: /buyer/inbound
language: en
accessLevel: public
roles: ["buyer", "farmer", "logistics", "admin"]
sensitivity: public
---

# APMC Buyer Workflow & Agreed Deals Guide

## Overview for APMC Buyers & Commission Agents
APMC Buyers and Traders operating in major agricultural yards (such as Vashi APMC, Nashik APMC, Pimpalgaon Baswant, and Gultekdi Pune) use KrishiFlow to source produce directly from regional farmers, post buying requirements, negotiate prices, and issue binding purchase quotes.

## Board Rates vs. Agreed Deal Rates
- **Board Rates (`boardRatePerKg`)**: Daily price data pulled from Agmarknet representing yesterday's modal price midpoint at APMC yards. This is used for market discovery and profit ranking.
- **Agreed Deal Rates (`agreedRatePerKg`)**: Commercial price explicitly agreed upon between a farmer and trader via the KrishiFlow platform.
- **The Deal Invariant**: A farmer cannot initiate transport booking or dispatch without an agreed rate recorded in `store.deals[]` or backend database for the active crop.

## APMC Buyer Inbound & Quote Workflow
1. **Trader Discovery & Matching**:
   - The platform matches farmers with verified APMC traders by normalizing market yard names and aliases (`sameMandi()` algorithm).
2. **Inquiry Threads & Negotiation**:
   - Farmers send price inquiries specifying crop type, quality grade, volume (in quintals or kg), and expected pickup date.
   - Traders review inbound inquiries in the **Buyer Inbound Screen**.
3. **Issuing Binding Quotes**:
   - The trader responds with a binding purchase quote (`agreedRatePerKg`).
   - Accepting the quote updates the consignment deal status and unlocks the vehicle pickup request flow for the farmer.
4. **Waybill & Receiving Receipts**:
   - Upon delivery by the assigned fleet driver, the APMC buyer verifies crop weight and quality, generating a digital waybill and releasing trader receipt records.
