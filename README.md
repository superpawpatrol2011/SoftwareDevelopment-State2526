# AccessBridge

**AccessBridge** is a browser-based accessibility web extension designed to remove barriers for people with **vision and hearing disabilities**. It enhances existing websites in real time by applying accessibility improvements and providing features that make online content more inclusive, understandable, and usable.

This project was developed by a two-person team using a clear division of responsibilities and a modular software architecture.

---

## Problem Statement

Many websites do not meet accessibility standards, creating barriers for users with visual or hearing impairments. Common issues include:

- Poor color contrast and unreadable text  
- Missing image descriptions (alt text)  
- Audio or video content without captions  
- Complex language that is difficult to understand  

These barriers limit equal access to education, information, and online services.

---

## Our Solution

AccessBridge is a **browser extension** that automatically detects accessibility issues on a webpage and fixes them in real time. It combines **frontend accessibility enforcement** with **backend processing** to deliver both immediate usability improvements and advanced assistive features.

---

## Key Features

### Vision Accessibility
- Automatic color contrast correction (WCAG-compliant)
- Adjustable text size and spacing
- Screen-reader-friendly DOM restructuring
- alt text for images without descriptions

### Hearing Accessibility
- Speech-to-text captions for audio and video content
- Text summaries of long audio or video segments
- Visual alternatives for audio-only cues

### Educational & Social Value
- Accessibility reports explaining detected issues
- References to WCAG guidelines in simple language
- Demonstrates inclusive design principles

---

## Technology Stack

### Frontend (Browser Extension)
- HTML  
- CSS  
- JavaScript  

### Backend (Processing)
- Python  
- FastAPI or Flask  
- speech-to-text, summarization, and image captioning  

---

## Repository Structure

AccessBridge/
├── README.md
├── docs/
├── extension/
├── backend/
├── tests/
├── scripts/
└── presentation/

---

## Team Roles & Directory Ownership

### Elio Gonzalez — Backend Lead

**Primary Responsibilities**
- Python backend architecture  
- (speech-to-text, summarization, alt-text)  
- Algorithm design and data processing  
- Backend testing and performance optimization  

**Owned Directories**

/backend
/tests/backend
/scripts
/docs/api-spec.md


---

### Corey Miranda — Frontend & Extension Lead

**Primary Responsibilities**
- Browser extension logic  
- JavaScript DOM scanning and manipulation  
- HTML/CSS UI design  
- Client-side accessibility fixes and overlays  

**Owned Directories**

/extension
/tests/extension
/docs/user-guide.md
/docs/accessibility-standards.md


---

### Shared Responsibilities
- System architecture decisions  
- Integration testing  
- Documentation review  
- Final presentation and demo  

---

## Architecture Overview

The system is divided into two major components:

1. **Browser Extension (Frontend)**
   - Scans webpages for accessibility issues  
   - Applies real-time fixes  
   - Sends requests to the backend for AI-powered processing  

2. **Python Backend **
   - Generates alt text for images  
   - Transcribes and summarizes audio/video content  
   - Simplifies complex text for readability  

Communication occurs through a clearly defined API contract.

---

## Testing & Validation

- WCAG contrast checks  
- Manual testing with screen readers  
- Real-world webpage testing  
- Unit and integration tests for backend services  

---

## Social Impact

AccessBridge promotes **digital inclusion** by helping users with disabilities independently access online content. It also serves as an educational tool that demonstrates how thoughtful software design can create real-world social benefits.

---

## Future Improvements

- Multilingual caption support  
- Dyslexia-friendly reading modes  
- Accessibility scoring for websites  
- Offline processing options  

---

## License

This project is released under the MIT License.
