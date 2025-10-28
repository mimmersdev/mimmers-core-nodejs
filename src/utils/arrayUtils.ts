/**
 * Compares two lists by key and returns a list of found and not found items.
 * @param sourceList - The source list to compare.
 * @param targetList - The target list to compare.
 * @param sourceKeySelector - The key selector for the source list.
 * @param targetKeySelector - The key selector for the target list.
 * @param transformFound - The transform function for the found items. Optional.
 * @returns A list of found and not found items.
 */
export function compareListsByKey<T, U, R = T>(
    sourceList: T[],
    targetList: U[],
    sourceKeySelector: (item: T) => string | number,
    targetKeySelector: (item: U) => string | number,
    transformFound?: (sourceItem: T, targetItem: U) => R
): {
    found: R[];
    notFound: U[];
} {
    // Create a Map for O(1) lookups from the source list
    const sourceMap = new Map(
        sourceList.map(item => [String(sourceKeySelector(item)), item])
    );

    const found: R[] = [];
    const notFound: U[] = [];

    // Single pass through target list - O(n)
    for (const targetItem of targetList) {
        const sourceItem = sourceMap.get(String(targetKeySelector(targetItem)));
        if (sourceItem) {
            if (transformFound) {
                found.push(transformFound(sourceItem, targetItem));
            } else {
                found.push(sourceItem as unknown as R);
            }
        } else {
            notFound.push(targetItem);
        }
    }

    return { found, notFound };
}