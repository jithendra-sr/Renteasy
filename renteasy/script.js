const tabButtons = document.querySelectorAll('.tab-btn');
const tabSections = document.querySelectorAll('.tab-section');
const filterNav = document.getElementById('filter-nav');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const target = btn.dataset.tab;
    tabSections.forEach(section => section.classList.remove('active'));
    document.getElementById(target + '-section').classList.add('active');

    if (filterNav) {
      filterNav.style.display = (target === 'browse') ? 'flex' : 'none';
    }
  });
});

const SHEET_ID = '1kkL8Wq2LACLknqp6RVQY9BjKSzSeJK5GxFiI6Ex_RBc';
const SHEET_NAME = 'Form responses 1';
const API_URL = `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(SHEET_NAME)}`;

const listingsContainer = document.getElementById('listings');
let allListings = [];

function getValue(item, targetKeys) {
  if (!item) return '';
  const itemKeys = Object.keys(item);
  for (const target of targetKeys) {
    const cleanTarget = target.trim().toLowerCase();
    const foundKey = itemKeys.find(k => k.trim().toLowerCase() === cleanTarget);
    if (foundKey && item[foundKey]) {
      return item[foundKey];
    }
  }
  return '';
}

async function loadListings() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Sheet fetch failed: ' + response.status);
    allListings = await response.json();
    renderCards(allListings);
  } catch (error) {
    if (listingsContainer) {
      listingsContainer.innerHTML = '<p>Could not load listings. Try again later.</p>';
    }
    console.error('Error fetching sheet data:', error);
  }
}

// Separate 1RK and 1BHK normalization logic
function normalizeType(rawType) {
  const t = (rawType || '').toLowerCase().trim();
  if (t === '1rk' || t.includes('1rk')) return '1rk';
  if (t === '1bhk' || t.includes('1bhk')) return '1bhk';
  if (t.includes('2bhk') || t.includes('3bhk') || t.includes('4bhk')) return '2bhk';
  if (t.includes('plot') || t.includes('commercial')) return 'plot';
  if (t.includes('office')) return 'office';
  return t;
}

function getDirectImageUrl(driveUrl) {
  if (!driveUrl) return null;
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return driveUrl;
}

function renderCards(listings) {
  if (!listingsContainer) return;
  listingsContainer.innerHTML = '';
  
  if (listings.length === 0) {
    listingsContainer.innerHTML = '<p>No listings found under this category.</p>';
    return;
  }
  
  listings.forEach((item) => {
    const title = getValue(item, ['Property name', 'Property Name', 'Property Title', 'Title', 'Name']) || 'Property Listing';
    const rawPrice = getValue(item, ['Property Price', 'Price', 'Property price']);
    const price = rawPrice ? `₹${rawPrice}/month` : 'Price on request';
    const location = getValue(item, ['PROPERTY LOCATION', 'Property Location', 'Location']) || 'Not specified';
    const rawType = getValue(item, ['Property Type', 'Type', 'Property type']);
    const type = normalizeType(rawType);

    const rawImagesString = getValue(item, ['UPLOAD YOUR PROPERTY IMAGES', 'Upload Image', 'Image', 'Images']);
    const firstImageUrl = rawImagesString ? getDirectImageUrl(rawImagesString.split(',')[0].trim()) : null;

    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.type = type;
    card.innerHTML = `
      ${firstImageUrl ? `<img src="${firstImageUrl}" class="card-thumb" alt="${title} thumbnail">` : '<div class="no-thumb">No Image</div>'}
      <h3>${title}</h3>
      <p class="price"><strong>Price:</strong> ${price}</p>
      <p class="location"><strong>Location:</strong> ${location}</p>
    `;
    card.addEventListener('click', () => showDetails(item));
    listingsContainer.appendChild(card);
  });
}

function showDetails(item) {
  const title = getValue(item, ['Property name', 'Property Name', 'Property Title', 'Title', 'Name']) || 'Property Listing';
  const rawPrice = getValue(item, ['Property Price', 'Price', 'Property price']);
  const price = rawPrice ? `₹${rawPrice}/month` : 'Price on request';
  const location = getValue(item, ['PROPERTY LOCATION', 'Property Location', 'Location']) || 'Not specified';
  const rawType = getValue(item, ['Property Type', 'Type', 'Property type']);
  const type = normalizeType(rawType);

  const rawPhone = getValue(item, ['PHOME NUMBER', 'PHONE NUMBER', 'Phone Number', 'Phone', 'Mobile Number', 'Contact Number', 'Contact']);
  const cleanPhone = String(rawPhone).replace(/\D/g, ''); 

  const rawImagesString = getValue(item, ['UPLOAD YOUR PROPERTY IMAGES', 'Upload Image', 'Image', 'Images']);
  const imageUrls = rawImagesString 
    ? rawImagesString.split(',').map(url => getDirectImageUrl(url.trim())).filter(url => url)
    : [];

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  let imageHTML = '';
  if (imageUrls.length > 1) {
    imageHTML = `
      <div class="carousel-container">
        <button class="carousel-btn prev" id="carousel-prev">&lt;</button>
        <div class="carousel-track-container">
          <ul class="carousel-track">
            ${imageUrls.map((url, index) => `<li class="carousel-slide ${index === 0 ? 'active' : ''}"><img src="${url}" alt="${title} photo ${index + 1}"></li>`).join('')}
          </ul>
        </div>
        <button class="carousel-btn next" id="carousel-next">&gt;</button>
        <div class="carousel-nav">
          ${imageUrls.map((_, index) => `<button class="carousel-indicator ${index === 0 ? 'active' : ''}"></button>`).join('')}
        </div>
      </div>
    `;
  } else if (imageUrls.length === 1) {
    imageHTML = `<img src="${imageUrls[0]}" style="width:100%; height:200px; object-fit:cover; border-radius:10px; margin-bottom:15px;" alt="${title}">`;
  } else {
    imageHTML = `<div class="no-img-modal">No images provided.</div>`;
  }

  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close">&times;</button>
      ${imageHTML}
      <h2 style="color:#38bdf8; margin-top:0;">${title}</h2>
      <p class="price"><strong>Price:</strong> ${price}</p>
      <p class="location"><strong>Location:</strong> ${location}</p>
      <p class="type"><strong>Type:</strong> ${type.toUpperCase()}</p>
      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 15px 0;">
      ${cleanPhone ? `
        <p class="phone-display" style="font-size: 15px; margin-bottom: 10px;"><strong>Phone:</strong> +91 ${cleanPhone}</p>
        <a class="contact-btn" href="https://wa.me/91${cleanPhone}?text=Hi,%20I'm%20interested%20in%20your%20property:%20${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer">
          Chat on WhatsApp
        </a>
      ` : '<p style="color: #94a3b8; font-style: italic;">No contact number provided</p>'}
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  if (imageUrls.length > 1) {
    initCarousel(modal);
  }
}

function initCarousel(modalElement) {
  const track = modalElement.querySelector('.carousel-track');
  const slides = Array.from(track.children);
  const nextBtn = modalElement.querySelector('#carousel-next');
  const prevBtn = modalElement.querySelector('#carousel-prev');
  const dotsNav = modalElement.querySelector('.carousel-nav');
  const dots = Array.from(dotsNav.children);

  let currentIndex = 0;

  const updateSlide = (index) => {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach(d => d.classList.remove('active'));
    dots[index].classList.add('active');
  };

  nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % slides.length;
    updateSlide(currentIndex);
  });

  prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    updateSlide(currentIndex);
  });

  dotsNav.addEventListener('click', (e) => {
    const targetDot = e.target.closest('button');
    if (!targetDot) return;
    currentIndex = dots.indexOf(targetDot);
    updateSlide(currentIndex);
  });
}

const filterButtons = document.querySelectorAll('.filter-btn');
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const type = btn.dataset.type;
    const filtered = type === 'all'
      ? allListings
      : allListings.filter(item => {
          const rawType = getValue(item, ['Property Type', 'Type', 'Property type']);
          return normalizeType(rawType) === type;
        });
    renderCards(filtered);
  });
});

// Direct Form Submission (Without Image Upload Service)
const form = document.getElementById('native-property-form');
const statusMsg = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzRUjeS1LJBAFbLhIqSPONnhpXa9T3sDLy8je3WlYVya9bbZnzVi-YoPCPUIN1bo9yU/exec'; 

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    statusMsg.className = 'form-status-msg';
    statusMsg.textContent = 'Submitting listing...';
    submitBtn.disabled = true;

    try {
      const payload = {
        title: document.getElementById('prop-name').value,
        price: document.getElementById('prop-price').value,
        location: document.getElementById('prop-location').value,
        type: document.getElementById('prop-type').value,
        phone: document.getElementById('prop-phone').value,
        image: "No image uploaded"
      };

      // Direct post to Google Apps Script
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      statusMsg.className = 'form-status-msg success';
      statusMsg.textContent = 'Listing submitted successfully!';
      form.reset();

      setTimeout(() => {
        loadListings();
      }, 2000);

    } catch (err) {
      console.error(err);
      statusMsg.className = 'form-status-msg error';
      statusMsg.textContent = 'Failed to submit property.';
    } finally {
      submitBtn.disabled = false;
    }
  });
}

loadListings();