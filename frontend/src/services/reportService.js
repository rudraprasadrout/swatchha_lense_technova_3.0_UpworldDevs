import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";
import { db, ensureAuthenticated, storage } from "../firebase/firebase.js";

const REPORTS_COLLECTION = "reports";
const REPORT_PHOTO_NAME = "photo.jpg";

class ReportServiceError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = "ReportServiceError";
        this.cause = cause;
    }
}

function toNumber(value, fieldName) {
    const parsed = typeof value === "string" ? Number.parseFloat(value) : Number(value);
    if (Number.isNaN(parsed)) {
        throw new ReportServiceError(`Invalid ${fieldName}. Expected a numeric value.`);
    }
    return parsed;
}

function toIsoString(value) {
    if (value == null || value === "") {
        return null;
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value.toDate === "function") {
        return value.toDate().toISOString();
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    return String(value);
}

function normalizeReport(snapshot) {
    if (!snapshot.exists()) {
        return null;
    }

    const data = snapshot.data();

    return {
        id: snapshot.id,
        photoUrl: data.photoUrl || "",
        photoPath: data.photoPath || `reports/${snapshot.id}/${REPORT_PHOTO_NAME}`,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        timestamp: data.timestamp || "",
        regionalVoiceLanguage: data.regionalVoiceLanguage || "",
        voiceTranscript: data.voiceTranscript || "",
        locationSensitivityZone: data.locationSensitivityZone || "",
        createdBy: data.createdBy || "",
        createdAt: toIsoString(data.createdAt),
        updatedAt: toIsoString(data.updatedAt)
    };
}

function sanitizeReportInput(reportData) {
    if (!reportData || typeof reportData !== "object") {
        throw new ReportServiceError("Report data is required.");
    }

    if (!reportData.photoFile) {
        throw new ReportServiceError("A photoFile is required to create or update a report.");
    }

    return {
        photoFile: reportData.photoFile,
        latitude: toNumber(reportData.latitude, "latitude"),
        longitude: toNumber(reportData.longitude, "longitude"),
        timestamp: reportData.timestamp || new Date().toISOString(),
        regionalVoiceLanguage: reportData.regionalVoiceLanguage || "en-IN",
        voiceTranscript: reportData.voiceTranscript || "",
        locationSensitivityZone: reportData.locationSensitivityZone || "None"
    };
}

function sanitizeUpdateData(data) {
    if (!data || typeof data !== "object") {
        throw new ReportServiceError("Update data is required.");
    }

    const updateData = {};

    if (data.photoFile) {
        updateData.photoFile = data.photoFile;
    }

    if (data.latitude !== undefined) {
        updateData.latitude = toNumber(data.latitude, "latitude");
    }

    if (data.longitude !== undefined) {
        updateData.longitude = toNumber(data.longitude, "longitude");
    }

    if (data.timestamp !== undefined) {
        updateData.timestamp = data.timestamp || new Date().toISOString();
    }

    if (data.regionalVoiceLanguage !== undefined) {
        updateData.regionalVoiceLanguage = data.regionalVoiceLanguage || "en-IN";
    }

    if (data.voiceTranscript !== undefined) {
        updateData.voiceTranscript = data.voiceTranscript || "";
    }

    if (data.locationSensitivityZone !== undefined) {
        updateData.locationSensitivityZone = data.locationSensitivityZone || "None";
    }

    return updateData;
}

function buildPhotoPath(reportId) {
    return `reports/${reportId}/${REPORT_PHOTO_NAME}`;
}

function normalizeFileType(file) {
    return file.type || "image/jpeg";
}

/**
 * @param {File} file
 * @param {string} [reportId]
 * @returns {Promise<string>}
 */
export async function uploadPhoto(file, reportId) {
    if (!(file instanceof Blob)) {
        throw new ReportServiceError("uploadPhoto expects a browser File or Blob.");
    }

    if (!reportId) {
        throw new ReportServiceError("A reportId is required to upload a report photo.");
    }

    try {
        await ensureAuthenticated();
        const storageRef = ref(storage, buildPhotoPath(reportId));
        await uploadBytes(storageRef, file, { contentType: normalizeFileType(file) });
        return await getDownloadURL(storageRef);
    } catch (error) {
        throw new ReportServiceError(`Failed to upload the report photo for ${reportId}.`, error);
    }
}

/**
 * @param {Object} reportData
 * @returns {Promise<Object>}
 */
export async function createReport(reportData) {
    const input = sanitizeReportInput(reportData);

    try {
        const user = await ensureAuthenticated();
        const reportRef = doc(collection(db, REPORTS_COLLECTION));
        const photoUrl = await uploadPhoto(input.photoFile, reportRef.id);

        const payload = {
            photoUrl,
            photoPath: buildPhotoPath(reportRef.id),
            latitude: input.latitude,
            longitude: input.longitude,
            timestamp: input.timestamp,
            regionalVoiceLanguage: input.regionalVoiceLanguage,
            voiceTranscript: input.voiceTranscript,
            locationSensitivityZone: input.locationSensitivityZone,
            createdBy: user.uid,
            createdAt: serverTimestamp()
        };

        await setDoc(reportRef, payload);

        const savedSnapshot = await getDoc(reportRef);
        const report = normalizeReport(savedSnapshot);

        if (!report) {
            throw new ReportServiceError("The report was created, but could not be read back from Firestore.");
        }

        return report;
    } catch (error) {
        if (error instanceof ReportServiceError) {
            throw error;
        }

        throw new ReportServiceError("Failed to create the report.", error);
    }
}

/**
 * @returns {Promise<Array<Object>>}
 */
export async function getReports() {
    try {
        await ensureAuthenticated();
        const snapshot = await getDocs(collection(db, REPORTS_COLLECTION));
        const reports = snapshot.docs
            .map((reportSnapshot) => normalizeReport(reportSnapshot))
            .filter(Boolean);

        reports.sort((left, right) => {
            const leftTime = Date.parse(left.createdAt || left.timestamp || 0) || 0;
            const rightTime = Date.parse(right.createdAt || right.timestamp || 0) || 0;
            return rightTime - leftTime;
        });

        return reports;
    } catch (error) {
        if (error instanceof ReportServiceError) {
            throw error;
        }

        throw new ReportServiceError("Failed to fetch reports.", error);
    }
}

/**
 * @param {string} reportId
 * @returns {Promise<Object|null>}
 */
export async function getReport(reportId) {
    if (!reportId) {
        throw new ReportServiceError("reportId is required.");
    }

    try {
        await ensureAuthenticated();
        const reportSnapshot = await getDoc(doc(db, REPORTS_COLLECTION, reportId));
        return normalizeReport(reportSnapshot);
    } catch (error) {
        if (error instanceof ReportServiceError) {
            throw error;
        }

        throw new ReportServiceError(`Failed to fetch report ${reportId}.`, error);
    }
}

/**
 * @param {string} reportId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateReport(reportId, data) {
    if (!reportId) {
        throw new ReportServiceError("reportId is required.");
    }

    const updateData = sanitizeUpdateData(data);

    try {
        await ensureAuthenticated();
        const reportRef = doc(db, REPORTS_COLLECTION, reportId);

        if (updateData.photoFile) {
            updateData.photoUrl = await uploadPhoto(updateData.photoFile, reportId);
            updateData.photoPath = buildPhotoPath(reportId);
            delete updateData.photoFile;
        }

        updateData.updatedAt = serverTimestamp();
        await updateDoc(reportRef, updateData);

        const updatedSnapshot = await getDoc(reportRef);
        const report = normalizeReport(updatedSnapshot);

        if (!report) {
            throw new ReportServiceError(`Report ${reportId} could not be read after update.`);
        }

        return report;
    } catch (error) {
        if (error instanceof ReportServiceError) {
            throw error;
        }

        throw new ReportServiceError(`Failed to update report ${reportId}.`, error);
    }
}

/**
 * @param {string} reportId
 * @returns {Promise<{id: string, deleted: boolean}>}
 */
export async function deleteReport(reportId) {
    if (!reportId) {
        throw new ReportServiceError("reportId is required.");
    }

    try {
        await ensureAuthenticated();
        const reportRef = doc(db, REPORTS_COLLECTION, reportId);
        const reportSnapshot = await getDoc(reportRef);
        const report = normalizeReport(reportSnapshot);

        if (report?.photoPath) {
            try {
                await deleteObject(ref(storage, report.photoPath));
            } catch (storageError) {
                console.warn(`Could not remove the stored photo for report ${reportId}.`, storageError);
            }
        }

        await deleteDoc(reportRef);
        return { id: reportId, deleted: true };
    } catch (error) {
        if (error instanceof ReportServiceError) {
            throw error;
        }

        throw new ReportServiceError(`Failed to delete report ${reportId}.`, error);
    }
}