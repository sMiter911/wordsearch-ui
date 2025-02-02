import { FormAction, injectLoad } from '@analogjs/router';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { load } from './search.server';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FetchResponse } from 'src/interfaces/fetchresponse';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div
      class="bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen flex flex-col items-center justify-center p-4"
    >
      <!-- Header -->
      <h1
        *ngIf="!loading && !error && meanings.length === 0"
        class="text-4xl text-center font-bold text-gray-800 mb-6 leading-tight animate-fade-in"
      >
        Unlock Word Power: Definitions, Phonetics & Examples with the Free
        Dictionary API
      </h1>

      <!-- Main Container -->
      <div
        class="flex flex-col lg:flex-row items-start justify-center gap-8 w-full max-w-6xl animate-fade-in-up"
      >
        <!-- Form Section -->
        <div
          class="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-lg transform transition-all hover:scale-105"
        >
          <h1
            class="text-3xl font-extrabold text-gray-800 text-center mb-6 tracking-wide"
          >
            Word Explorer
          </h1>
          <form (ngSubmit)="onSubmit()" class="mb-6">
            <input
              type="text"
              name="search"
              placeholder="Enter a word..."
              [(ngModel)]="searchWord"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 text-gray-700 placeholder-gray-400"
            />
            <div
              class="flex flex-col lg:flex-row items-center justify-center gap-4 mt-6"
            >
              <button
                type="button"
                (click)="clearSearch()"
                class="w-full lg:w-auto bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-6 rounded-lg hover:from-gray-600 hover:to-gray-700 shadow-md hover:shadow-lg transform transition duration-300 hover:-translate-y-1"
              >
                Clear
              </button>
              <button
                type="submit"
                class="w-full lg:w-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transform transition duration-300 hover:-translate-y-1"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        <!-- Results Section -->
        <div
          *ngIf="loading || meanings.length > 0 || error"
          class="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-2xl transform transition-all hover:scale-100"
        >
          <!-- Loader -->
          <div *ngIf="loading" class="flex justify-center items-center py-8">
            <div
              class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
            ></div>
          </div>

          <!-- Error Message -->
          <div
            *ngIf="error"
            class="text-red-500 text-center mb-6 font-semibold"
          >
            {{ error }}
          </div>

          <!-- Display Meanings -->
          <div *ngIf="meanings.length > 0">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">
              Results : {{ word }}
            </h2>
            <div *ngFor="let phonetic of phonetics" class="mb-8">
              <p class="text-gray-800 text-base">
                <strong>Phonetic:</strong> {{ phonetic.text }}
              </p>
              <button
                *ngIf="phonetic.audio"
                (click)="playAudio(phonetic.audio)"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg mt-2 hover:bg-blue-700 transition duration-200"
              >
                Play Audio
              </button>
            </div>
            <div *ngFor="let meaning of meanings" class="mb-8">
              <h3 class="text-xl font-semibold capitalize text-blue-600 mb-4">
                {{ meaning.partOfSpeech }}
              </h3>
              <ul class="list-disc pl-5 space-y-4">
                <li *ngFor="let definition of meaning.definitions">
                  <p class="text-gray-800 text-base">
                    <strong>Definition:</strong> {{ definition.definition }}
                  </p>
                  <p *ngIf="definition.example" class="text-gray-600 italic">
                    <strong>Example:</strong> "{{ definition.example }}"
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .loader {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
    }

    @keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-in-out;
}

.animate-fade-in-up {
  animation: fade-in-up 0.5s ease-in-out;
}

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `,
})
export default class HomeComponent {
  searchWord = signal('');
  error: string | null = null;
  word: string | null = null;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example: string | null }[];
  }[] = [];
  phonetics: { text: string; audio: string | null }[] = [];
  private http = inject(HttpClient);
  loading: boolean = false;

  onSubmit() {
    const searchWord = this.searchWord();
    if (searchWord) {
      this.loading = true;
      this.error = null;
      console.log('searchWord', searchWord);
      this.getWordDescription(searchWord);
    } else {
      this.error = 'Please enter a word';
      console.log('Search word is empty');
    }
  }

  public getWordDescription(request: String) {
    this.meanings = [];
    this.http
      .post<FetchResponse>('/api/v1/search/wordsearch', request)
      .subscribe({
        next: (data) => {
          if (data.WordSearchResponses == null) {
            this.error = 'No definitions found. Please try another word.';
          } else if (data.StatusCode === 429) {
            this.error = data.Message;
          }

          console.log('Result', data);
          this.word = data.WordSearchResponses[0].word;
          this.meanings = data.WordSearchResponses.flatMap((item: any) =>
            item.meanings.map((meaning: any) => ({
              partOfSpeech: meaning.partOfSpeech,
              definitions: meaning.definitions.map((definition: any) => ({
                definition: definition.definition,
                example: definition.example || null,
              })),
            }))
          );
          this.phonetics = data.WordSearchResponses.flatMap((item: any) =>
            item.phonetics.map((phonetic: any) => ({
              text: phonetic.text,
              audio: phonetic.audio || null,
            }))
          );
        },
        complete: () => {
          this.loading = false;
        },
        error: () => {
          this.error = 'No definitions found. Please try another word.';
        },
      });
  }

  playAudio(audioUrl: string) {
    const audio = new Audio(audioUrl);
    audio.play();
  }

  clearSearch() {
    this.searchWord.set('');
    this.meanings = [];
    this.phonetics = [];
    this.error = null;
    this.loading = false;
    this.word = null;
  }
}
