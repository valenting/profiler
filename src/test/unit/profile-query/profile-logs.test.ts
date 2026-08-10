/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { collectProfileLogs } from 'firefox-profiler/profile-query/formatters/marker-info';
import { ThreadMap } from 'firefox-profiler/profile-query/thread-map';
import { getProfileWithMarkers } from '../../fixtures/profiles/processed-profile';
import { storeWithProfile } from '../../fixtures/stores';

function setup(markers: Parameters<typeof getProfileWithMarkers>[0]) {
  const profile = getProfileWithMarkers(markers);
  const store = storeWithProfile(profile);
  const threadMap = new ThreadMap();
  threadMap.handleForThreadIndex(0);
  return { store, threadMap };
}

describe('collectProfileLogs', function () {
  // In the new Log payload format both `level` and `message` are declared as
  // `format: 'unique-string'` in the marker schema, so their payload values are
  // string-table indexes rather than inline strings. Build these markers fresh
  // for each test: the fixture interns those fields by mutating the payloads in
  // place, so sharing them across tests would leave stale indexes behind.
  function newFormatMarkers() {
    return [
      [
        'nsHttp',
        170,
        null,
        {
          type: 'Log',
          level: 'Error',
          message: 'ParentChannelListener::ParentChannelListener',
        },
      ],
      [
        'nsJarProtocol',
        190,
        null,
        {
          type: 'Log',
          level: 'Warning',
          message: 'nsJARChannel::nsJARChannel [this=0x87f1ec80]\n',
        },
      ],
      [
        'cubeb',
        200,
        null,
        { type: 'Log', level: 'Info', message: 'cubeb_init' },
      ],
    ] as Parameters<typeof getProfileWithMarkers>[0];
  }

  it('formats new-format log markers in the MOZ_LOG format', function () {
    const { store, threadMap } = setup(newFormatMarkers());
    const result = collectProfileLogs(store, threadMap, {});
    expect(result.totalCount).toBe(3);
    expect(result.entries).toEqual([
      '1970-01-01 00:00:00.170000000 UTC - [Unknown Process 0: Empty]: E/nsHttp ParentChannelListener::ParentChannelListener',
      '1970-01-01 00:00:00.190000000 UTC - [Unknown Process 0: Empty]: W/nsJarProtocol nsJARChannel::nsJARChannel [this=0x87f1ec80]',
      '1970-01-01 00:00:00.200000000 UTC - [Unknown Process 0: Empty]: I/cubeb cubeb_init',
    ]);
  });

  it('filters new-format log markers by the message text', function () {
    const { store, threadMap } = setup(newFormatMarkers());
    const result = collectProfileLogs(store, threadMap, {
      search: 'jarchannel',
    });
    expect(result.totalCount).toBe(1);
    expect(result.entries).toEqual([
      '1970-01-01 00:00:00.190000000 UTC - [Unknown Process 0: Empty]: W/nsJarProtocol nsJARChannel::nsJARChannel [this=0x87f1ec80]',
    ]);
  });

  it('formats legacy-format log markers in the MOZ_LOG format', function () {
    const { store, threadMap } = setup([
      [
        'LogMessages',
        170,
        null,
        {
          type: 'Log',
          name: 'ParentChannelListener::ParentChannelListener\n',
          module: 'D/nsHttp',
        },
      ],
      [
        'LogMessages',
        190,
        null,
        {
          type: 'Log',
          name: 'nsJARChannel::nsJARChannel [this=0x87f1ec80]\n',
          module: 'nsJarProtocol',
        },
      ],
    ]);
    const result = collectProfileLogs(store, threadMap, {});
    expect(result.entries).toEqual([
      '1970-01-01 00:00:00.170000000 UTC - [Unknown Process 0: Empty]: D/nsHttp ParentChannelListener::ParentChannelListener',
      '1970-01-01 00:00:00.190000000 UTC - [Unknown Process 0: Empty]: D/nsJarProtocol nsJARChannel::nsJARChannel [this=0x87f1ec80]',
    ]);
  });
});
