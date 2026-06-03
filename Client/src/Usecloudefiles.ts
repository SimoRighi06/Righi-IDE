import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "./useAuth";

const API = "http://localhost:5000/api";

export interface CloudFile {
  _id: string;
  name: string;
  type: "file" | "folder";
  language: string;
  rigContent: string;
  translatedContent: string;
  parentId: string | null;
  updatedAt: string;
}

export const useCloudFiles = () => {
  const { user } = useAuth();
  const [files, setFiles]     = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/files`);
      setFiles(data);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const createFile = async (name: string, type: "file" | "folder", parentId: string | null = null) => {
    const { data } = await axios.post(`${API}/files`, { name, type, parentId });
    setFiles(prev => [data, ...prev]);
    return data as CloudFile;
  };

  const saveFile = async (id: string, updates: Partial<CloudFile>) => {
    const { data } = await axios.put(`${API}/files/${id}`, updates);
    setFiles(prev => prev.map(f => f._id === id ? data : f));
    return data as CloudFile;
  };

  const deleteFile = async (id: string) => {
    await axios.delete(`${API}/files/${id}`);
    setFiles(prev => prev.filter(f => f._id !== id && f.parentId !== id));
  };

  const renameFile = async (id: string, name: string) => {
    return saveFile(id, { name });
  };

  return { files, loading, createFile, saveFile, deleteFile, renameFile, refetch: fetchFiles };
};