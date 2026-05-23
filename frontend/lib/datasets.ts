import { apiClient } from "./http";

export type DatasetUpload = {
  id: number;
  filename: string;
  uploaded_by: string;
  hospital_id: number | null;
  upload_timestamp: string;
};

export async function fetchDatasetUploads(): Promise<DatasetUpload[]> {
  const response = await apiClient.get<DatasetUpload[]>("/dataset-uploads");
  return response.data;
}

export async function uploadDatasetFile(
  file: File,
  onUploadProgress?: (percentage: number) => void,
): Promise<DatasetUpload> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<DatasetUpload>("/dataset-uploads", formData, {
    onUploadProgress: (event) => {
      if (event.total && onUploadProgress) {
        onUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });

  return response.data;
}
