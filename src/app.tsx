import type {FC} from 'react';
import React from 'react';
import {Counter} from "./components/counter";
import {ThemeWrapper} from "./components/theme-wrapper";
import {DeepLink} from "./components/deep-link";


const App: FC = () => {
	return (
		<ThemeWrapper>

			<Counter/>
			<DeepLink/>

		</ThemeWrapper>
	);
}

export default App;
