
import { axiosInstance } from "../lib/axios";



export const updateProfile = async (profileData) => {
  try {
  const response = await axiosInstance.put("/user/profile", profileData, {
    withCredentials: true,
  });
  return response.data; 
  } catch (error) {
    throw error;
  }
};



export const updateProfileImage = async (imageFile) => {
  const formData = new FormData();
  formData.append("image", imageFile);

  const response = await axiosInstance.put(
    "/user/profile/image",
    formData,
    {
      withCredentials: true,
    }
  );

  return response.data;
};



export const deleteAccount = async () => {
  try {
  await axiosInstance.delete("/user/account", {
    withCredentials: true,
  });
  } catch (error) {
    throw error;
  }
};