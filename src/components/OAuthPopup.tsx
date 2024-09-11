import { useEffect, useMemo } from 'react';
import { OAUTH_RESPONSE, OAUTH_RESPONSE_ACK } from './constants';
import {
	channelPostMessage,
	checkState,
	isBroadcastChannel,
	queryToObject,
	removeState,
} from './tools';
import { TMessageData } from './types';

type Props = {
	Component?: React.ReactElement;
};

let didInit = false;

export const OAuthPopup = ({
	Component = (
		<div style={{ margin: '12px' }} data-testid="popup-loading">
			Loading...
		</div>
	),
}: Props) => {
	const channel = useMemo(() => new BroadcastChannel('refrens_oauth_channel'), []);

	useEffect(() => {
		if (didInit) return () => {};
		didInit = true;

		const payload = {
			...queryToObject(window.location.search.split('?')[1]),
			...queryToObject(window.location.hash.split('#')[1]),
		};
		const state = payload?.state;
		const error = payload?.error;

		if (isBroadcastChannel(channel)) {
			const stateOk = state && checkState(sessionStorage, state);

			if (!error && stateOk) {
				channelPostMessage(channel, { type: OAUTH_RESPONSE, payload });
			} else {
				const errorMessage = error
					? decodeURI(error)
					: `${
							stateOk
								? 'OAuth error: An error has occured.'
								: 'OAuth error: State mismatch.'
						}`;
				channelPostMessage(channel, { type: OAUTH_RESPONSE, error: errorMessage });

				console.error('message sent', errorMessage);
			}
		} else {
			throw new Error('No BroadcastChannel support');
		}

		const handleListener = (message: MessageEvent<TMessageData>) => {
			const type = message?.data?.type;
			if (type !== OAUTH_RESPONSE_ACK) {
				return;
			}
			window.close();
			removeState(sessionStorage);
		};

		// eslint-disable-next-line unicorn/prefer-add-event-listener
		channel.addEventListener('message', handleListener);

		return () => {
			channel.removeEventListener('message', handleListener);
		};
	}, [channel]);

	return Component;
};
