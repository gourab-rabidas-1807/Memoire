// ======================================================
// MÉMOIRE — PRIVATE PHOTO GALLERY
// ======================================================

// ------------------------------------------------------
// ELEMENTS
// ------------------------------------------------------

const loginScreen = document.getElementById("loginScreen");
const galleryScreen = document.getElementById("galleryScreen");

const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");

const showPassword = document.getElementById("showPassword");
const logoutButton = document.getElementById("logoutButton");

const photoInput = document.getElementById("photoInput");
const gallery = document.getElementById("gallery");
const emptyState = document.getElementById("emptyState");

const photoViewer = document.getElementById("photoViewer");
const viewerImage = document.getElementById("viewerImage");
const viewerName = document.getElementById("viewerName");

const closeViewer = document.getElementById("closeViewer");
const toast = document.getElementById("toast");


// ------------------------------------------------------
// PASSWORD SHOW / HIDE
// ------------------------------------------------------

if (showPassword) {
    showPassword.addEventListener("click", () => {

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            showPassword.textContent = "●";
        } else {
            passwordInput.type = "password";
            showPassword.textContent = "○";
        }

    });
}


// ------------------------------------------------------
// TOAST
// ------------------------------------------------------

function showToast(message) {

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


// ------------------------------------------------------
// LOGIN
// ------------------------------------------------------

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        loginError.textContent = "";

        const password = passwordInput.value.trim();

        if (!password) {
            loginError.textContent = "Please enter your password.";
            return;
        }

        loginError.textContent = "Opening MÉMOIRE…";

        try {

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: PRIVATE_EMAIL,
                    password: password
                });

            if (error) {
                console.error("LOGIN ERROR:", error);

                loginError.textContent =
                    error.message || "Incorrect password.";

                return;
            }

            console.log("LOGIN SUCCESS:", data);

            passwordInput.value = "";
            loginError.textContent = "";

            loginScreen.classList.add("hidden");
            galleryScreen.classList.remove("hidden");

            await loadPhotos();

        } catch (err) {

            console.error("LOGIN EXCEPTION:", err);

            loginError.textContent =
                "Something went wrong. Please try again.";

        }

    });

}


// ------------------------------------------------------
// LOAD PHOTOS
// ------------------------------------------------------

async function loadPhotos() {

    console.log("Loading photos...");

    gallery.innerHTML = "";

    try {

        const { data: files, error } =
            await supabaseClient.storage
                .from("photos")
                .list("", {
                    limit: 100,
                    sortBy: {
                        column: "created_at",
                        order: "desc"
                    }
                });

        if (error) {
            console.error("LOAD PHOTOS ERROR:", error);
            showToast(error.message);
            return;
        }

        console.log("FILES FOUND:", files);

        if (!files || files.length === 0) {

            if (emptyState) {
                emptyState.style.display = "block";
            }

            return;
        }

        if (emptyState) {
            emptyState.style.display = "none";
        }

        for (const file of files) {

            if (!file.name) continue;

            const { data: signedData, error: signedError } =
                await supabaseClient.storage
                    .from("photos")
                    .createSignedUrl(file.name, 3600);

            if (signedError) {
                console.error(
                    "SIGNED URL ERROR:",
                    signedError
                );
                continue;
            }

            if (!signedData?.signedUrl) continue;

            createPhotoCard(
                signedData.signedUrl,
                file.name
            );
        }

    } catch (err) {

        console.error("LOAD EXCEPTION:", err);
        showToast("Unable to load photos.");

    }
}


// ------------------------------------------------------
// CREATE PHOTO CARD
// ------------------------------------------------------

function createPhotoCard(url, name) {

    const card = document.createElement("div");

    card.className = "photo-card";

    const image = document.createElement("img");

    image.src = url;
    image.alt = "MÉMOIRE memory";
    image.loading = "lazy";

    card.appendChild(image);

    card.addEventListener("click", () => {

        viewerImage.src = url;

        if (viewerName) {
            viewerName.textContent = name;
        }

        photoViewer.classList.remove("hidden");

    });

    gallery.appendChild(card);
}


// ------------------------------------------------------
// UPLOAD PHOTOS
// ------------------------------------------------------

if (photoInput) {

    photoInput.addEventListener("change", async () => {

        console.log("PHOTO INPUT CHANGED");

        const files = Array.from(photoInput.files || []);

        console.log("SELECTED FILES:", files);

        if (files.length === 0) {
            console.log("No files selected.");
            return;
        }

        showToast("Uploading memories…");

        let successful = 0;

        for (const file of files) {

            console.log("Uploading:", file.name);

            // Maximum 50 MB
            if (file.size > 50 * 1024 * 1024) {

                showToast(
                    `${file.name} is larger than 50 MB.`
                );

                continue;
            }

            // Only images
            if (!file.type.startsWith("image/")) {

                showToast(
                    `${file.name} is not an image.`
                );

                continue;
            }

            const extension =
                file.name.includes(".")
                    ? file.name.substring(
                        file.name.lastIndexOf(".")
                    )
                    : "";

            const filename =
                `${Date.now()}-${crypto.randomUUID()}${extension}`;

            console.log("NEW FILE NAME:", filename);

            try {

                const { data, error } =
                    await supabaseClient.storage
                        .from("photos")
                        .upload(
                            filename,
                            file,
                            {
                                cacheControl: "3600",
                                upsert: false,
                                contentType: file.type
                            }
                        );

                console.log("UPLOAD RESULT:", data);
                console.log("UPLOAD ERROR:", error);

                if (error) {

                    console.error(
                        "UPLOAD FAILED:",
                        error
                    );

                    showToast(
                        "Upload failed: " + error.message
                    );

                    continue;
                }

                successful++;

            } catch (err) {

                console.error(
                    "UPLOAD EXCEPTION:",
                    err
                );

                showToast(
                    "Upload error: " + err.message
                );
            }
        }

        // Clear selected files
        photoInput.value = "";

        // Reload gallery
        await loadPhotos();

        if (successful > 0) {

            showToast(
                `${successful} memory${
                    successful > 1 ? "ies" : ""
                } uploaded successfully.`
            );

        } else {

            showToast(
                "No photos were uploaded."
            );
        }

    });

}


// ------------------------------------------------------
// FULLSCREEN VIEWER
// ------------------------------------------------------

if (closeViewer) {

    closeViewer.addEventListener("click", () => {

        photoViewer.classList.add("hidden");

        viewerImage.src = "";

    });

}


if (photoViewer) {

    photoViewer.addEventListener("click", (event) => {

        if (event.target === photoViewer) {

            photoViewer.classList.add("hidden");

            viewerImage.src = "";

        }

    });

}


// ------------------------------------------------------
// LOGOUT / LOCK
// ------------------------------------------------------

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        await supabaseClient.auth.signOut();

        gallery.innerHTML = "";

        galleryScreen.classList.add("hidden");
        loginScreen.classList.remove("hidden");

        passwordInput.value = "";

        showToast("MÉMOIRE locked.");

    });

}


// ------------------------------------------------------
// CHECK EXISTING SESSION
// ------------------------------------------------------

async function checkSession() {

    try {

        const {
            data: { session }
        } = await supabaseClient.auth.getSession();

        if (session) {

            loginScreen.classList.add("hidden");
            galleryScreen.classList.remove("hidden");

            await loadPhotos();

        } else {

            loginScreen.classList.remove("hidden");
            galleryScreen.classList.add("hidden");

        }

    } catch (err) {

        console.error(
            "SESSION ERROR:",
            err
        );

    }

}


// ------------------------------------------------------
// START
// ------------------------------------------------------

checkSession();
