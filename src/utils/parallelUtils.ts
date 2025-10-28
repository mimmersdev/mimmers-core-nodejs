/**
 * Chunks an array into smaller arrays of a given size.
 * @param array - The array to chunk.
 * @param chunkSize - The size of each chunk.
 * @returns An array of chunks.
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * Processes chunks in parallel with controlled concurrency.
 * @param items - The items to process.
 * @param chunkSize - The size of each chunk.
 * @param processChunk - The function to process each chunk.
 * @param maxConcurrency - The maximum concurrency.
 * @returns An array of results.
 */
export async function processChunksInParallel<T, R>(
    items: T[],
    chunkSize: number,
    processChunk: (chunk: T[]) => Promise<R>,
    maxConcurrency: number
): Promise<R[]> {
    const chunks = chunkArray(items, chunkSize);
    const results: R[] = [];

    // Process chunks in parallel with limited concurrency
    for (let i = 0; i < chunks.length; i += maxConcurrency) {
        const batch = chunks.slice(i, i + maxConcurrency);

        const batchResults = await Promise.all(batch.map(chunk => processChunk(chunk)));
        results.push(...batchResults);
    }

    return results;
}

/**
 * Processes chunks in parallel and sums the results.
 * @param items - The items to process.
 * @param chunkSize - The size of each chunk.
 * @param processChunk - The function to process each chunk.
 * @param maxConcurrency - The maximum concurrency.
 * @returns The sum of the results.
 */
export async function processChunksInParallelWithSum<T>(
    items: T[],
    chunkSize: number,
    processChunk: (chunk: T[]) => Promise<number>,
    maxConcurrency: number
): Promise<number> {
    const results = await processChunksInParallel(items, chunkSize, processChunk, maxConcurrency);
    return results.reduce((total, result) => total + result, 0);
}

/**
 * Processes paginated operations in parallel.
 * @param totalCount - The total number of items.
 * @param pageSize - The size of each page.
 * @param readPage - The function to read each page.
 * @param maxConcurrency - The maximum concurrency.
 * @returns An array of results.
 */
export async function processPaginatedInParallel<T>(
    totalCount: number,
    pageSize: number,
    readPage: (offset: number, limit: number) => Promise<T[]>,
    maxConcurrency: number
): Promise<T[]> {
    const totalPages = Math.ceil(totalCount / pageSize);
    const allResults: T[] = [];

    // Process pages in parallel with limited concurrency
    for (let i = 0; i < totalPages; i += maxConcurrency) {
        const batchStart = i;
        const batchEnd = Math.min(i + maxConcurrency, totalPages);
        
        // Create promises for this batch of pages
        const batchPromises = [];
        for (let pageIndex = batchStart; pageIndex < batchEnd; pageIndex++) {
            const offset = pageIndex * pageSize;
            const limit = Math.min(pageSize, totalCount - offset); // Handle last page
            
            batchPromises.push(readPage(offset, limit));
        }

        // Execute batch in parallel
        const batchResults = await Promise.all(batchPromises);
        
        // Flatten and add results
        for (const pageResult of batchResults) {
            allResults.push(...pageResult);
        }
    }

    return allResults;
}

/**
 * Processes paginated operations with progress tracking.
 * @param totalCount - The total number of items.
 * @param pageSize - The size of each page.
 * @param readPage - The function to read each page.
 * @param maxConcurrency - The maximum concurrency.
 * @param onProgress - The function to track progress.
 * @returns An array of results.
 */
export async function processPaginatedWithProgress<T>(
    totalCount: number,
    pageSize: number,
    readPage: (offset: number, limit: number) => Promise<T[]>,
    maxConcurrency: number,
    onProgress?: (currentPage: number, totalPages: number, recordsProcessed: number) => void
): Promise<T[]> {
    const totalPages = Math.ceil(totalCount / pageSize);
    let recordsProcessed = 0;

    // Create a wrapper function that tracks progress
    const readPageWithProgress = async (offset: number, limit: number): Promise<T[]> => {
        const result = await readPage(offset, limit);
        recordsProcessed += result.length;
        
        // Calculate current page for progress reporting
        const currentPage = Math.floor(offset / pageSize) + 1;
        if (onProgress) {
            onProgress(currentPage, totalPages, recordsProcessed);
        }
        
        return result;
    };

    // Reuse the existing parallel processing function
    return await processPaginatedInParallel(
        totalCount,
        pageSize,
        readPageWithProgress,
        maxConcurrency
    );
}