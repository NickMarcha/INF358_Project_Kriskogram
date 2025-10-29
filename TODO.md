# TODO — Explorer Page (only)

Focus this list on the Explorer at `/explorer`. Keep demos unchanged.

## ✅ Done
- [x] Explorer route with header navigation
- [x] IndexedDB persistent storage (datasets store)
- [x] Preload default datasets (CSV 2021, sample GEXF)
- [x] Sidebar to list/select datasets
- [x] Import datasets (.csv, .gexf)
- [x] Year slider when dataset has a time range (UI exists, but not updating visualization)
- [x] Render selected snapshot with Kriskogram

## 🐛 Critical Issues to Fix
- [x] **Year slider not working**: Fixed snapshot lookup to handle number/string timestamps, added useEffect to update visualization when snapshot changes
- [x] **Dynamic property detection**: Added `detectDatasetProperties()` function that scans nodes/edges to detect all properties
- [x] **Store dataset metadata**: Metadata is now detected and stored when importing datasets (CSV and GEXF)

## ⏭ Missing Features from State Migration Demo

### Filtering Controls (like StateMigrationDemo)
- [x] Min threshold slider for edge values
- [x] Max threshold slider for edge values  
- [x] Max edges to display limit (reduce visual clutter)
- [ ] Filter by migration_type when available in edges

### Statistics Panel
- [x] Total nodes count
- [x] Total edges count (in full dataset)
- [x] Visible nodes count (after filtering)
- [x] Visible edges count (after filtering)
- [x] Average migration value (calculated)
- [x] Max migration value (used for threshold max)

### Node Ordering Controls (Horizontal Axis)
- [ ] Alphabetical (by id or label)
- [ ] By region (if `region` property exists)
- [ ] By division (if `division` property exists)
- [ ] By population (if `population` property exists, numeric sort)
- [ ] By economic_index (if `economic_index` property exists, numeric sort)
- [ ] By latitude/longitude (if geographic properties exist)

### Color/Stlying Controls
- [ ] **Edge color modes** (dynamically show based on available properties):
  - [ ] Grayscale (weight-based luminosity)
  - [ ] By region (if nodes have `region`, same-region flows colored, cross-region grayscale)
  - [ ] By division (if nodes have `division`, same-division flows colored, cross-division grayscale)
  - [ ] By migration_type (if edges have `migration_type`)
- [ ] **Node color modes**:
  - [ ] Single color
  - [ ] By region (if `region` exists)
  - [ ] By economic_index gradient (if `economic_index` exists)
- [ ] **Edge width scale**: Linear vs sqrt vs log
- [ ] **Arc opacity slider** (0-100%)

### Additional Features
- [ ] Legend panel (show color encodings like StateMigrationDemo)
- [ ] Top N migrations table (sortable, expandable)
- [ ] Dataset delete action in sidebar
- [ ] Dataset rename (inline edit in sidebar)

### Alternative Visualizations for Comparison
- [x] **View selector UI**: Added visualization type selector (Kriskogram, Table, Sankey, Chord) in explorer
- [x] **Table View**: Implemented basic table view using TanStack Table showing edges (From, To, Value) with sorting
- [ ] **Sankey Diagram Visualization**
  - [x] Component placeholder created (SankeyView.tsx)
  - [ ] Integrate [d3-sankey](https://github.com/d3/d3-sankey) library (install package first)
  - [ ] Implement actual Sankey diagram rendering
  - [ ] Review data structure compatibility between Kriskogram and Sankey formats
  - [ ] Ensure same dataset can be viewed in both Kriskogram and Sankey views
  - [ ] Handle bidirectional flows appropriately (Sankey limitation - may need workaround)
- [ ] **Chord Diagram Visualization**
  - [x] Component placeholder created (ChordView.tsx)
  - [ ] Integrate [d3-chord](https://github.com/d3/d3-chord) library (install package first)
  - [ ] Implement actual Chord diagram rendering
  - [ ] Review data structure compatibility between Kriskogram and Chord formats
  - [ ] Ensure same dataset can be viewed in all four visualization types (Kriskogram, Table, Sankey, Chord)
  - [ ] Note: All four visualizations are now selectable in explorer, share same filtered data

## 🐛 Known Issues / Fixed
- [x] **Fixed**: "can't access lexical declaration 'currentSnapshot' before initialization" - Reordered declarations so `currentSnapshot` is defined before useEffects
- [x] **Fixed**: Filter thresholds now reset and auto-adjust when dataset/snapshot changes
- [x] **Fixed**: "Show All" button now only enabled/highlighted when filters are actually hiding data

## 🔧 Implementation Notes
- All controls should check for property existence before showing/hiding options
- Store detected properties in `StoredDataset` metadata when importing
- Use same filtering/ordering logic as StateMigrationDemo but make it property-agnostic
- Filters reset automatically when dataset or snapshot changes
- For Sankey/Chord: Review data structure to ensure compatibility - may need adapter functions to convert between formats
- Sankey/Chord implementations should reuse same filtering/control logic where applicable




