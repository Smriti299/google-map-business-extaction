# Duplicate Removal System

This package removes duplicate business profiles using rules:

- Same Google Maps URL
- Same normalized phone number
- Same name + address pair

Use `DuplicateRemover.remove_duplicates(profiles)` to deduplicate a list of profile dictionaries.
