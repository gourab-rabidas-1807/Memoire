// ============================================
// MÉMOIRE — PRIVATE PHOTO GALLERY
// ============================================

const loginScreen = document.getElementById("loginScreen");
const galleryScreen = document.getElementById("galleryScreen");

const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
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


// ============================================
// PASSWORD SHOW / HIDE
// ============================================

showPassword.addEventListener("click", () => {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";
        showPassword.textContent = "●";

    } else {

        passwordInput.type = "password";
        showPassword.textContent = "○";

    }

});


// ============================================
// LOGIN
// ============================================

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    loginError.textContent = "";

    const password = passwordInput.value;

    if (!password) {
        return;
    }

    loginError.textContent = "Opening MÉMOIRE…";

    const { error } =
        await supabaseClient.auth.signInWithPassword({
            email: PRIVATE_EMAIL,
            password: password
        });


    if (error) {

        console.error(error);

        loginError.textContent =
            "Incorrect password.";

        passwordInput.value = "";

        return;
    }


    passwordInput.value = "";

    loginError.textContent = "";

    loginScreen.classList.add("hidden");

    galleryScreen.classList.remove("hidden");

    await loadPhotos();

});


// ============================================
// LOGOUT / LOCK
// ============================================

logoutButton.addEventListener("click", async () => {

    await supabaseClient.auth.signOut();

    galleryScreen.classList.add("hidden");

    loginScreen.classList.remove("hidden");

    passwordInput.value = "";

});


// ============================================
// LOAD PHOTOS
// ============================================

async function loadPhotos() {

    gallery.innerHTML = "";

    const {
        data,
        error
    } = await supabaseClient.storage
        .from("photos")
        .list("", {
            limit: 1000,
            sortBy: {
                column: "created_at",
                order: "desc"
            }
        });


    if (error) {

        console.error(error);

        showToast("Unable to load memories.");

        return;
    }


    const photos =
        (data || []).filter(file => file.name);


    if (photos.length === 0) {

        emptyState.style.display = "block";

        return;
    }


    emptyState.style.display = "none";


    for (const file of photos) {

        await createPhotoCard(file);

    }

}


// ============================================
// CREATE PHOTO CARD
// ============================================

async function createPhotoCard(file) {

    const {
        data,
        error
    } = await supabaseClient.storage
        .from("photos")
        .createSignedUrl(
            file.name,
            60 * 60
        );


    if (error || !data?.signedUrl) {

        console.error(error);

        return;
    }


    const card =
        document.createElement("article");

    card.className = "photo-card";


    const image =
        document.createElement("img");

    image.src = data.signedUrl;

    image.alt = "Memory";

    image.loading = "lazy";


    image.addEventListener("click", () => {

        viewerImage.src =
            data.signedUrl;

        viewerName.textContent =
            file.name;

        photoViewer.classList.remove("hidden");

    });


    card.appendChild(image);

    gallery.appendChild(card);

}


// ============================================
// CLOSE PHOTO VIEWER
// ============================================

closeViewer.addEventListener("click", closePhotoViewer);


photoViewer.addEventListener("click", (event) => {

    if (event.target === photoViewer) {

        closePhotoViewer();

    }

});


function closePhotoViewer() {

    photoViewer.classList.add("hidden");

    viewerImage.src = "";

}


// ============================================
// UPLOAD PHOTOS
// ============================================

photoInput.addEventListener("change", async () => {

    const files =
        Array.from(photoInput.files || []);


    if (files.length === 0) {
        return;
    }


    showToast("Saving your memories…");


    let successful = 0;


    for (const file of files) {

        /*
         * Maximum size:
         * 50 MB per file with the current
         * Supabase Storage configuration.
         */

        if (file.size > 50 * 1024 * 1024) {

            showToast(
                `${file.name} is larger than 50 MB.`
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


        const {
            error
        } = await supabaseClient.storage
            .from("photos")
            .upload(
                filename,
                file,
                {
                    cacheControl: "3600",
                    upsert: false
                }
            );


        if (error) {

            console.error(error);

            continue;
        }


        successful++;

    }


    photoInput.value = "";


    await loadPhotos();


    if (successful > 0) {

        showToast(
            `${successful} memory${successful > 1 ? "ies" : ""} saved ✦`
        );

    } else {

        showToast(
            "No photos were uploaded."
        );

    }

});


// ============================================
// TOAST
// ============================================

let toastTimer;


function showToast(message) {

    toast.textContent = message;

    toast.classList.add("show");


    clearTimeout(toastTimer);


    toastTimer =
        setTimeout(() => {

            toast.classList.remove("show");

        }, 3000);

}


// ============================================
// CHECK EXISTING SESSION
// ============================================

async function checkSession() {

    const {
        data: {
            session
        }
    } = await supabaseClient.auth.getSession();


    if (session) {

        loginScreen.classList.add("hidden");

        galleryScreen.classList.remove("hidden");

        await loadPhotos();

    }

}


checkSession();
