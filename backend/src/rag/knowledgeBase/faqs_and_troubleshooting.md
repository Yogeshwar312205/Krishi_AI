---
documentId: faqs-and-troubleshooting
title: KrishiFlow FAQs, Credentials & Troubleshooting Guide
source: krishiflow-docs
url: /docs/faq
language: en
accessLevel: public
roles: ["farmer", "logistics", "buyer", "admin"]
sensitivity: public
---

# KrishiFlow FAQs, Credentials & Troubleshooting Guide

## Frequently Asked Questions (FAQs)

### Q: What is KrishiFlow?
**A**: KrishiFlow is an AI-powered agricultural logistics and route optimization platform connecting farmers with regional APMC mandis and nearby fleet transporters to maximize crop profit and eliminate spoilage.

### Q: How do demo accounts work in KrishiFlow?
**A**: Users can register a new account or log into existing profiles created during account setup. Profiles exist for Farmers, Fleet Transporters, and APMC Wholesale Buyers.

### Q: Why is my pickup request not showing any vehicle options?
**A**: A pickup request requires an agreed trader deal rate (`agreedRatePerKg`) for the active crop type. Once agreed, fleet owners view the request on their Dispatch screen and allocate an optimal vehicle based on VRP capacity and route detour distance.

### Q: How does refrigerated cold chain transport work?
**A**: Refrigerated trucks slow down crop perishability. The spoilage decay constant is reduced by up to 70%, extending fresh transit windows for high-value perishable crops like tomatoes, grapes, and leafy vegetables.

### Q: Does KrishiFlow support drone delivery?
**A**: No. KrishiFlow does not support drone delivery. All transport is conducted via registered regional road vehicles (e.g. Mini Trucks, Heavy Freighters, Refrigerated Vans, E-Pickups).

### Q: Which languages are supported by KrishiFlow?
**A**: KrishiFlow fully supports **English (en)**, **Hindi (hi)**, and **Marathi (mr)** across the user interface and the AI Sahayak RAG Assistant.

## Troubleshooting Common Operational Issues

### Issue: "Authentication Failed / Database Unavailable" Notice
- **Explanation**: The backend automatically falls back to the high-performance In-Memory Mock Store if MongoDB Atlas connection or credentials fail. All features remain operational for demo walkthroughs.

### Issue: Map tile worker error or blank map display
- **Fix**: Ensure `vite.config.js` maintains `optimizeDeps.exclude: ['maplibre-gl']` so MapLibre GL worker script resolves properly without bundler collision.
