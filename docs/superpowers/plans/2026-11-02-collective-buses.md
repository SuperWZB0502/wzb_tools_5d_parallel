# Collective Bus and MoE Ownership Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline and request an independent final review.

**Goal:** Implement the user's five latest refinements to MoE weight partitioning and collective communication.

**Architecture:** Keep the offline single HTML. Add pure ownership and bus grouping/routing helpers to the model; draw each actual module/domain/group once with one shared horizontal bus and one stem per visible member. Keep rank-level PP independent.

**Tech Stack:** Native HTML/CSS/JavaScript/SVG, Node assertions and Edge/Playwright.

**Spec:** Latest user message dated 2026-11-02; existing docs/design.md with these refinements taking precedence.

## Global Constraints
- Normal MoE: EP columns and TP rows; local rectangle is exactly 1/EP wide and 1/TP tall. Extended MoE: TP×EP columns with full-height local rectangle.
- Attention uses bottom ports in the upper half of the module gap. MoE uses top ports in the lower half. TP stays centered; EP/CP/DP progressively offset left/right endpoints symmetrically. Bus ends join rounded end legs without overhang. Point-to-point fallback follows direction; PP uses source left 4/5 height and destination left 1/5 height (latest refinement).
- One visible group bus per module/domain/group; merge phase/operator descriptions without losing actual members or relation semantics. Order near-to-far: TP, EP, CP, DP. Single-card groups produce no collective.
- Preserve offline operation, filters, locked selection, stage virtualization, query, exports and 4096-card budget.

## Review Focus
- Multiple enabled phases must not duplicate a module/domain member stem.
- Noncontiguous and partially visible groups must retain full actual membership in details and honest visible counts.
- Labels must not cover other buses, stems or module captions; remaining unavoidable same-half intersections use bridges.
- Size=1, no experts, extremely many members and long indices remain bounded.
- PP forward/backward ports must use the actual direction's source and target, including collapsed neighbors.

### Task 1: Ownership and bus model
Files: tools/draw_parallel_card.html; tests/v6-model.test.cjs.
- [x] Add failing tests for four EP2/TP2 quadrants, extended columns, merged phases, bus ordering/geometry and PP quarter-height ports.
- [x] Run the tests to verify the missing behaviors fail.
- [x] Implement weight partition geometry, unique collective buses, half-gap layout and routable shared bars/member stems.
- [x] Run new and existing model tests, updating only superseded expectations.

### Task 2: SVG rendering and interaction
Files: tools/draw_parallel_card.html; tests/v6-browser.test.cjs; existing browser suites.
- [x] Verify two-dimensional MoE fill and one stem per TP4 member in browser tests.
- [x] Render inline domain/operator labels, independently styled phase sections on shared bars, label-aware stems, and PP quarter ports.
- [x] Verify both halves, filters, optimizer, partial groups, export and no external requests.
- [x] Inspect screenshots, request independent review, fix concrete findings, and run all model/browser suites.
- [x] Update README/design and report only verified results.
