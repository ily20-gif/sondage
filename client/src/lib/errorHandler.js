/**
 * Extracts error message from axios error response
 * @param {Error} error - The error object from axios catch block
 * @returns {string} - The error message from backend or a default message
 */
export const getErrorMessage = (error) => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  if (error?.message) {
    return error.message;
  }
  return "Une erreur s'est produite. Veuillez réessayer.";
};

