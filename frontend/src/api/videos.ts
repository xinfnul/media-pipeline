import type {
	CreateVideoPayload,
	CreateVideoResponse,
	VideoResponse,
} from "@/types/video";
import { apiClient } from "./client";

export async function createVideoRequest(
	payload: CreateVideoPayload,
): Promise<CreateVideoResponse> {
	const { data } = await apiClient.post<CreateVideoResponse>(
		"/videos",
		payload,
	);

	return data;
}

export async function listVideoRequest(): Promise<VideoResponse[]> {
	const { data } = await apiClient.get<VideoResponse[]>("/videos");

	return data;
}

export async function getVideoRequest(id: string): Promise<VideoResponse> {
	const { data } = await apiClient.get<VideoResponse>(`/videos/${id}`);

	return data;
}
