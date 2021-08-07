## Summary of Changes
<!-- Example:
  - Resolves issue #25
  - Adds `total_llp` property to the `LeylineUser` class
  - Update `profile` cmd to display total earned LLP instead of current LLP balance
-->

## Imagery
<!-- "None" if no images -->

## Testing Procedure
<!-- Example:
  1. Run the `profile` command
  2. Ensure the LLP balance field now displays lifetime LLP earned, instead of current LLP balance
-->

## Additional Notes
<!-- Example:
  I chose to modify the `LeylineUser` class instead of the `FirebaseAPI` because of performance reasons. I found that changing the `FirebaseAPI` class was 25% slower.
-->
