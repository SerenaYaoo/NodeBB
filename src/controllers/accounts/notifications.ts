import { Request, Response, NextFunction } from 'express';
import * as user from '../../user';
import * as helpers from '../helpers';
import * as plugins from '../../plugins';
import * as pagination from '../../pagination';

interface RegularFilter {
    name: string;
    filter: string;
    selected?: boolean;
}

interface SeparatorFilter {
    separator: boolean;
}

interface ExtendedRequest extends Request {
    uid?: string | number;
}

type Filter = RegularFilter | SeparatorFilter;

interface NotificationsController {
    get(req: ExtendedRequest, res: Response, next: NextFunction): Promise<void>;
}

const notificationsController: NotificationsController = {
    async get(req: ExtendedRequest, res: Response, next: NextFunction): Promise<void> {
        const regularFilters: Filter[] = [
            { name: '[[notifications:all]]', filter: '' },
            { name: '[[global:topics]]', filter: 'new-topic' },
            { name: '[[notifications:replies]]', filter: 'new-reply' },
            { name: '[[notifications:chat]]', filter: 'new-chat' },
            { name: '[[notifications:group-chat]]', filter: 'new-group-chat' },
            { name: '[[notifications:follows]]', filter: 'follow' },
            { name: '[[notifications:upvote]]', filter: 'upvote' },
        ];

        const moderatorFilters: Filter[] = [
            { name: '[[notifications:new-flags]]', filter: 'new-post-flag' },
            { name: '[[notifications:my-flags]]', filter: 'my-flags' },
            { name: '[[notifications:bans]]', filter: 'ban' },
        ];

        const filter = req.query.filter || '';
        const page = Math.max(1, Number(req.query.page) || 1);

        const itemsPerPage = 20;
        const start = (page - 1) * itemsPerPage;
        const stop = start + itemsPerPage - 1;

        interface FiltersResponse {
            regularFilters: Filter[];
            moderatorFilters: Filter[];
        }

        const [filters, isPrivileged] = await Promise.all([
            plugins.hooks.fire('filter:notifications.addFilters', {
                regularFilters,
                moderatorFilters,
                uid: req.uid,
            }) as Promise<FiltersResponse>,
            user.isPrivileged(req.uid),
        ]);


        let allFilters: Filter[] = filters.regularFilters;
        if (isPrivileged) {
            allFilters = allFilters.concat([{ separator: true }]).concat(filters.moderatorFilters);
        }

        const selectedFilter = allFilters.find((filterData: Filter) => {
            if ('filter' in filterData) {
                filterData.selected = filterData.filter === filter;
                return filterData.selected;
            }
            return false;
        });

        if (!selectedFilter) {
            return next();
        }

        let nids: number[]; // here making assumption that notification ids are in integer type

        if ('filter' in selectedFilter) {
            nids = await user.notifications.getAll(req.uid, selectedFilter.filter);
        } else {
            return;
        }

        let notifications = await user.notifications.getNotifications(nids, req.uid);

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
    },
};

export default notificationsController;


