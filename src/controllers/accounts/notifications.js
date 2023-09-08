"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const user = __importStar(require("../../user"));
const helpers = __importStar(require("../helpers"));
const plugins = __importStar(require("../../plugins"));
const pagination = __importStar(require("../../pagination"));
const notificationsController = {
    get(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const regularFilters = [
                { name: '[[notifications:all]]', filter: '' },
                { name: '[[global:topics]]', filter: 'new-topic' },
                { name: '[[notifications:replies]]', filter: 'new-reply' },
                { name: '[[notifications:chat]]', filter: 'new-chat' },
                { name: '[[notifications:group-chat]]', filter: 'new-group-chat' },
                { name: '[[notifications:follows]]', filter: 'follow' },
                { name: '[[notifications:upvote]]', filter: 'upvote' },
            ];
            const moderatorFilters = [
                { name: '[[notifications:new-flags]]', filter: 'new-post-flag' },
                { name: '[[notifications:my-flags]]', filter: 'my-flags' },
                { name: '[[notifications:bans]]', filter: 'ban' },
            ];
            const filter = req.query.filter || '';
            const page = Math.max(1, Number(req.query.page) || 1);
            const itemsPerPage = 20;
            const start = (page - 1) * itemsPerPage;
            const stop = start + itemsPerPage - 1;
            // added expected type as boolean
            const [filters, isPrivileged] = yield Promise.all([
                plugins.hooks.fire('filter:notifications.addFilters', {
                    regularFilters,
                    moderatorFilters,
                    uid: req.uid,
                }),
                user.isPrivileged(req.uid),
            ]);
            let allFilters = filters.regularFilters;
            if (isPrivileged) {
                allFilters = allFilters.concat([{ separator: true }]).concat(filters.moderatorFilters);
            }
            const selectedFilter = allFilters.find((filterData) => {
                if ('filter' in filterData) {
                    filterData.selected = filterData.filter === filter;
                    return filterData.selected;
                }
                return false;
            });
            if (!selectedFilter) {
                return next();
            }
            let nids; // here making assumption that notification ids are in integer type
            if ('filter' in selectedFilter) {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                nids = yield user.notifications.getAll(req.uid, selectedFilter.filter);
            }
            else {
                return;
            }
            // defining notification as string
            let notifications = yield user.notifications.getNotifications(nids, req.uid);
            const pageCount = Math.max(1, Math.ceil(notifications.length / itemsPerPage));
            notifications = notifications.slice(start, stop + 1);
            res.render('notifications', {
                notifications,
                pagination: pagination.create(page, pageCount, req.query),
                filters: allFilters,
                regularFilters,
                moderatorFilters,
                selectedFilter,
                title: '[[pages:notifications]]',
                breadcrumbs: helpers.buildBreadcrumbs([{ text: '[[pages:notifications]]' }]),
            });
        });
    },
};
exports.default = notificationsController;
