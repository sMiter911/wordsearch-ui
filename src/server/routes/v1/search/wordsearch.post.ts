import { defineEventHandler, readBody } from 'h3';

export default defineEventHandler(async (request) => {
  const lambdaUrl = import.meta.env['VITE_LAMBDA_FUNCTION_URL'];
  try {
    const body = await readBody(request);
    const response = await $fetch<FetchResponse>(lambdaUrl, {
      headers: {
        'Content-Type': 'text/plain',
      },
      method: 'POST',
      body: body,
    });

    return response;
  } catch (error) {
    console.log(error);
    return {
      error: (error as Error).message,
      status: 500,
    };
  }
});
