import { Location } from '@angular/common';
import { Component, Inject, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatStep, MatStepper } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';
import * as Sentry from '@sentry/browser';
import { forkJoin, Subscription } from 'rxjs';

import { ServerMessageDialogComponent } from '../authorize/components/server-message-dialog/server-message-dialog.component';
import { ClearHistoryDialogComponent } from '../shared/components/clear-history-dialog/clear-history-dialog.component';
import { HistoryHelper } from '../shared/helpers/history.helper';
import { AccountInfo } from '../shared/interfaces/account-info.interface';
import { ExtendedAreaInfo } from '../shared/interfaces/area.interface';
import { Character } from '../shared/interfaces/character.interface';
import { ErrorMessage } from '../shared/interfaces/error-message.interface';
import { NetWorthHistory } from '../shared/interfaces/income.interface';
import { League } from '../shared/interfaces/league.interface';
import { Player } from '../shared/interfaces/player.interface';
import { AccountService } from '../shared/providers/account.service';
import { AnalyticsService } from '../shared/providers/analytics.service';
import { ElectronService } from '../shared/providers/electron.service';
import { ExternalService } from '../shared/providers/external.service';
import { LogMonitorService } from '../shared/providers/log-monitor.service';
import { MapService } from '../shared/providers/map.service';
import { PartyService } from '../shared/providers/party.service';
import { PricingService } from '../shared/providers/pricing.service';
import { SessionService } from '../shared/providers/session.service';
import { SettingsService } from '../shared/providers/settings.service';
import { ProfileSelection, CharacterStore, LeagueStore } from '../shared/interfaces/settings-store.interface';


@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
    accFormGroup: FormGroup;
    leagueFormGroup: FormGroup;
    sessFormGroup: FormGroup;
    charFormGroup: FormGroup;
    pathFormGroup: FormGroup;
    privateProfileError = false;
    pathValid = false;
    isLoading = false;
    isFetching = false;
    isFetchingLeagues = false;
    fetchedLeagues = false;
    fetched = false;
    characterList: Character[] = [];
    leagues: League[];
    tradeLeagues: League[];
    player = {} as Player;
    leagueName: string;
    tradeLeagueName: string;
    characterName: string;
    accountName: string;
    sessionId: string;
    sessionIdValid = false;
    filePath: string;
    netWorthHistory: NetWorthHistory;
    areaHistory: ExtendedAreaInfo[];
    form: any;
    needsValidation: boolean;
    leagueChanged = false;
    shouldSetup = true;
    spectatorCode = '';
    leaguesSub: Subscription;
    characterListSub: Subscription;
    lineReader: any;
    groupNoExists = false;
    providedSpectatorCode = undefined;

    private profile: ProfileSelection;

    @ViewChild('stepper') stepper: MatStepper;
    @ViewChild('lastStep') lastStep: MatStep;

    constructor(@Inject(FormBuilder) fb: FormBuilder,
        private router: Router,
        private externalService: ExternalService,
        public electronService: ElectronService,
        private accountService: AccountService,
        public sessionService: SessionService,
        public partyService: PartyService,
        private settingsService: SettingsService,
        private analyticsService: AnalyticsService,
        public logMonitorService: LogMonitorService,
        private pricingService: PricingService,
        private mapService: MapService,
        private dialog: MatDialog,
        private route: ActivatedRoute,
        private ngZone: NgZone,
        private location: Location
    ) {
        if (this.electronService.isElectron()) {
            this.lineReader = window.require('read-last-lines');
        }

        this.leaguesSub = this.externalService.leagues.subscribe((res: League[]) => {
            this.leagues = res;
        });

        this.fetchSettings();

        Sentry.configureScope((scope) => {
            scope.setUser({ 'username': this.accountName });
        });

        this.accFormGroup = fb.group({
            accountName: [this.accountName !== undefined ? this.accountName : '', Validators.required]
        });
        this.leagueFormGroup = fb.group({
            leagueName: [this.leagueName !== undefined ? this.leagueName : '', Validators.required],
            tradeLeagueName: [this.tradeLeagueName !== undefined ? this.tradeLeagueName : '', Validators.required]
        });
        this.sessFormGroup = fb.group({
            sessionId: [this.sessionId !== undefined ? this.sessionId : '']
        });
        this.charFormGroup = fb.group({
            characterName: [this.characterName !== undefined ? this.characterName : '', Validators.required]
        });
        this.pathFormGroup = fb.group({
            filePath: [this.filePath !== undefined ? this.filePath : '', Validators.required]
        });

        this.logMonitorService.trackMapsOnly = this.logMonitorService.trackMapsOnly !== undefined ?
            this.logMonitorService.trackMapsOnly : true;
    }

    checkPath() {
        if (this.electronService.isElectron()) {
            this.pathValid = this.electronService.fs.existsSync(this.pathFormGroup.controls.filePath.value)
                && this.pathFormGroup.controls.filePath.value.toLowerCase().endsWith('client.txt');
        }
    }

    ngOnDestroy() {
        if (this.leaguesSub !== undefined) {
            this.leaguesSub.unsubscribe();
        }
        if (this.characterListSub !== undefined) {
            this.characterListSub.unsubscribe();
        }
    }

    openLink(link: string) {
        if (this.electronService.isElectron()) {
            this.electronService.shell.openExternal(link);
        } else {
            window.open(link, '_blank');
        }
    }

    resetStepper() {
        this.stepper.reset();
        this.stepper.selectedIndex = 1;
    }

    resetPrivateProfileError() {
        this.privateProfileError = false;
    }

    getRequiredState() {
        setTimeout(() => {
            return this.privateProfileError
                || (!this.sessionIdValid && !this.needsValidation && this.sessFormGroup.controls.sessionId.value !== '');
        });
    }

    fetchSettings() {

        this.profile = this.settingsService.get('profile');
        const currentCharacter = this.settingsService.getCurrentCharacter();

        if (this.profile !== undefined) {

            if (currentCharacter !== undefined) {
                this.netWorthHistory = currentCharacter.networth;
                this.areaHistory = currentCharacter.areas;
            }

            this.characterName = this.profile.characterName;
            this.tradeLeagueName = this.profile.tradeLeagueName;
            this.sessionId = this.profile.sessionId;
            this.accountName = this.profile.accountName;
            this.leagueName = this.profile.leagueName;
            this.sessionIdValid = this.profile.sessionIdValid;
            this.filePath = this.profile.filePath;
        }

        if (this.areaHistory === undefined) {
            this.areaHistory = [];
        } else {
            if (this.areaHistory.length > 1000) {
                this.areaHistory = this.areaHistory.slice(0, 1000);
            }
        }

        // Set up placeholder history if we don't have any
        if (!this.netWorthHistory || this.netWorthHistory.history.length === 0) {
            this.netWorthHistory = {
                lastSnapshot: 0,
                history: [{
                    timestamp: 0,
                    value: 0,
                    items: []
                }]
            };
        }
    }

    ngOnInit() {
        if (this.electronService.isElectron()) {
            this.externalService.getLeagues('main', 1).subscribe(leagues => {
                if (leagues.find(l => l.id === this.leagueName) === undefined ||
                    leagues.find(l => l.id === this.tradeLeagueName) === undefined) {
                    this.initSetup();
                    this.settingsService.set('profile', undefined);
                    this.stepper.selectedIndex = 0;
                }
            });
        }

        if (!this.electronService.isElectron()) {
            this.route.params.subscribe(params => {
                this.providedSpectatorCode = params.code;
            });
            this.partyService.connectionInitiated.subscribe(res => {
                if (res && this.providedSpectatorCode !== '' && this.providedSpectatorCode !== undefined) {
                    this.loadGroup(this.providedSpectatorCode);
                }
            });
        }

        this.accountService.loggingIn = true;
        this.characterListSub = this.accountService.characterList.subscribe(res => {
            if (res !== undefined) {
                this.characterList = res;
            }
        });
        this.checkPath();
        this.sessFormGroup.valueChanges.subscribe(val => {
            this.needsValidation = true;
        });

        // bypass to complete if settings are prefilled
        if (this.characterName !== undefined &&
            this.sessionId !== undefined &&
            this.accountName !== undefined &&
            this.leagueName !== undefined &&
            this.tradeLeagueName !== undefined &&
            this.sessionIdValid !== undefined &&
            this.filePath !== undefined &&
            this.netWorthHistory !== undefined &&
            this.areaHistory !== undefined) {

            this.shouldSetup = false;

            // for (let i = 0; i < 6; i++) {
            //     this.stepper.selectedIndex = i;
            // }

            this.getLeagues(undefined, false);
            this.getCharacterList(undefined, false);
        }
    }

    initSetup() {
        this.shouldSetup = true;
    }

    setSessionCookie(sessionId: string) {
        this.externalService.setCookie(sessionId);
    }

    getLeagues(accountName?: string, skipStep?: boolean, shouldValidate = false) {
        this.isFetchingLeagues = true;

        const sessId = this.sessFormGroup.controls.sessionId.value;

        const request = forkJoin(
            this.externalService.getCharacterList(accountName !== undefined ? accountName :
                this.accFormGroup.controls.accountName.value, (sessId !== undefined && sessId !== '') ? sessId : undefined),
            this.externalService.getLeagues('main', 1)
        );

        request.subscribe(res => {
            // filter out SSF-leagues when listing trade-leagues
            this.tradeLeagues = res[1].filter(x => x.id.indexOf('SSF') === -1);

            if (res[0] === null) {
                // profile is private
                this.privateProfileError = true;
                this.isFetchingLeagues = false;
            } else {

                // map character-leagues to new array
                const distinctLeagues = [];
                res[0].forEach(char => {
                    if (distinctLeagues.find(l => l.id === char.league) === undefined) {
                        distinctLeagues.push({ id: char.league } as League);
                    }
                });

                this.externalService.leagues.next(distinctLeagues);
                this.fetchedLeagues = true;
                if (skipStep) {
                    setTimeout(() => {
                        this.stepper.selectedIndex = 2;
                    }, 250);
                }
                setTimeout(() => {
                    this.isFetchingLeagues = false;
                }, 500);

                if (shouldValidate) {
                    const form = this.getFormObj();
                    const requests = [];
                    distinctLeagues.forEach(league => {
                        requests.push(this.externalService.validateSessionId(
                            form.sessionId,
                            form.accountName,
                            league.id,
                            0
                        ));
                    });

                    this.sendValidateRequests(requests);
                }
            }
        });
    }

    mapTradeLeague(event) {
        // if the league is a tradeleague, auto-select tradeleague
        if (this.tradeLeagues.find(x => x.id === event.value)) {
            this.leagueFormGroup.controls.tradeLeagueName.setValue(event.value);
        }
    }

    openErrorMsgDialog(data: ErrorMessage): void {
        setTimeout(() => {
            const dialogRef = this.dialog.open(ServerMessageDialogComponent, {
                width: '850px',
                data: {
                    icon: 'error',
                    title: data.title,
                    content: data.body
                }
            });
            dialogRef.afterClosed().subscribe(result => {
            });
        }, 0);
    }

    getCharacterList(accountName?: string, skipStep?: boolean) {
        this.isFetching = true;
        const sessId = this.sessFormGroup.controls.sessionId.value;

        this.externalService.getCharacterList(accountName !== undefined ? accountName : this.accFormGroup.controls.accountName.value,
            (sessId !== undefined && sessId !== '') ? sessId : undefined)
            .subscribe((res) => {
                this.fetched = true;

                if (res === true) {
                    this.openErrorMsgDialog({
                        title: 'Could not fetch characters',
                        // tslint:disable-next-line:max-line-length
                        body: 'Character-list could not be fetched. This is most likely caused from your character-list being hidden.<br/><br/>' +
                            'To resolve this, uncheck "Hide Characters tab" in the privacy-settings over at pathofexile.com<br/><br/>' +
                            'If it still does not work, fetch a new session ID and update it in the login-settings.'
                    } as ErrorMessage);
                    this.isFetching = false;
                } else {

                    const charactersByLeague = res.filter(x => x.league === this.leagueFormGroup.controls.leagueName.value);
                    this.accountService.characterList.next(charactersByLeague);

                    if (this.characterList.find(x => x.name === this.characterName) === undefined) {
                        this.charFormGroup.controls.characterName.setValue('');
                    }
                    if (skipStep) {
                        setTimeout(() => {
                            this.stepper.selectedIndex = 3;
                        }, 250);
                    }
                    setTimeout(() => {
                        this.isFetching = false;
                    }, 500);
                }
            },
                error => {
                    this.accountService.characterList.next([]);
                    this.isFetching = false;
                }
            );
    }

    getFormObj() {
        return {
            accountName: this.accFormGroup.controls.accountName.value,
            characterName: this.charFormGroup.controls.characterName.value,
            leagueName: this.leagueFormGroup.controls.leagueName.value,
            tradeLeagueName: this.leagueFormGroup.controls.tradeLeagueName.value,
            sessionId: this.sessFormGroup.controls.sessionId.value,
            filePath: this.pathFormGroup.controls.filePath.value,
            sessionIdValid: this.sessionIdValid
        } as AccountInfo;
    }

    browse() {
        this.electronService.remote.dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] },
            selectedFiles => this.directorySelectorCallback(selectedFiles));
    }

    directorySelectorCallback(filePath) {
        if (filePath !== undefined) {
            this.pathFormGroup.controls.filePath.setValue(filePath[0]);
            setTimeout(() => {
                this.checkPath();
                this.ngZone.run(() => {
                    this.likelyhoodCheck(filePath[0]);
                });
            }, 500);
        }
    }

    likelyhoodCheck(filePath) {
        if (this.lineReader !== undefined) {
            this.lineReader.read(filePath, 2)
                .then((lines) => {
                    const twoDaysAgo = (Date.now() - (60 * 60 * 1000 * 48));
                    const lastTimestamp = Date.parse(lines.slice(0, 19));
                    // if last timestamp is more than 2 days ago, show warning-dialog
                    if (twoDaysAgo > lastTimestamp) {
                        const errorMsg = {
                            title: 'Wrong Client.txt selected?',
                            body: 'We detected that your Client.txt contains older data.<br/><br/>' +
                                'Make sure to select the file from the same directory as you run the game from.'
                        } as ErrorMessage;
                        this.openErrorMsgDialog(errorMsg);
                    }
                });
        }
    }

    checkLeagueChange(event) {
    }

    login() {
        this.isLoading = true;
        this.form = this.getFormObj();
        this.analyticsService.startTracking(this.form.accountName);

        const request = forkJoin(
            this.externalService.getCharacterInventory(this.form.accountName, this.form.characterName),
        );

        request.subscribe(res => {
            const player = this.externalService.setCharacter(res[0], this.player);
            this.player = player;
            this.completeLogin();
        });
    }

    loadGroup(spectatorCode: string) {

        spectatorCode = spectatorCode.toUpperCase();

        const player = {
            isSpectator: true,
            netWorthSnapshots: [{
                timestamp: 0,
                value: 0,
                items: []
            }]
        } as Player;

        this.partyService.checkIfPartyExists(spectatorCode).then(exists => {
            if (exists) {
                this.location.go('/spectate/' + spectatorCode);
                this.partyService.joinParty('', spectatorCode, player);
                this.router.navigate(['/authorized/party'], { skipLocationChange: true });
            } else {
                this.groupNoExists = true;
                this.providedSpectatorCode = undefined;
            }
        });
    }

    validateSessionId() {
        const form = this.getFormObj();
        this.getLeagues(form.accountName, false, true);
    }

    sendValidateRequests(requests: any) {
        forkJoin(requests).subscribe(results => {
            const successfulRequest = results.find(x => x !== false && x !== null);
            this.needsValidation = false;
            this.sessionIdValid = successfulRequest !== false && successfulRequest !== undefined;
        });
    }

    completeLogin() {
        this.player.account = this.form.accountName;
        this.player.netWorthSnapshots = this.netWorthHistory.history;

        const oneDayAgo = (Date.now() - (24 * 60 * 60 * 1000));


        this.externalService.validateSessionId(
            this.form.sessionId,
            this.player.account,
            this.player.character.league,
            0
        ).subscribe(res => {
            this.sessionIdValid = res !== false;
            this.form = this.getFormObj();
            this.player.sessionIdProvided = this.sessionIdValid;

            let characters: CharacterStore[] = this.settingsService.get('characters');
            const newCharacter = {
                name: this.form.characterName,
                areas: this.areaHistory, networth: this.netWorthHistory
            } as CharacterStore;
            if (characters === undefined) {
                characters = [newCharacter];
            }
            if (characters.find(l => l.name === this.form.characterName) === undefined) {
                characters.push(newCharacter);
            }
            this.settingsService.set('characters', characters);
            this.settingsService.set('profile', this.form);
            this.areaHistory = this.settingsService.getCurrentCharacter().areas;

            const newLeague = { name: this.form.leagueName, stashtabs: [] } as LeagueStore;
            let leagues: LeagueStore[] = this.settingsService.get('leagues');
            if (leagues === undefined) {
                leagues = [newLeague];
            }
            if (leagues.find(l => l.name === this.form.leagueName) === undefined) {
                leagues.push(newLeague);
            }
            this.settingsService.set('leagues', leagues);

            // if trade-league has changed since last login, we should update ninjaprices
            if (this.tradeLeagueName !== this.leagueFormGroup.controls.tradeLeagueName.value) {
                this.externalService.tradeLeagueChanged = true;
            } else {
                this.externalService.tradeLeagueChanged = false;
            }

            this.player.pastAreas = HistoryHelper.filterAreas(this.areaHistory, oneDayAgo);

            this.accountService.player.next(this.player);
            this.accountService.accountInfo.next(this.form);

            this.accountService.loggingIn = false;
            this.sessionService.completedLogin = true;

            this.pricingService.retrieveExternalPrices().subscribe();
            this.sessionService.initSession(this.form.sessionId);
            this.isLoading = false;
            this.settingsService.set('lastLeague', this.leagueFormGroup.controls.leagueName.value);
            this.router.navigate(['/authorized/dashboard']);
        });
    }
}
