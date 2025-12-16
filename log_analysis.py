
import re

log_content = """
[1765471918] <inf> data_bridge: New offline data is available 4 file size 90
[1765471918] <inf> data_bridge: Offline data sent successfully
[1765471919] <inf> data_bridge: New offline data is available 3 file size 210
[1765471920] <inf> data_bridge: Offline data sent successfully
[1765471921] <inf> data_bridge: New offline data is available 7 file size 266
[1765472832] <inf> data_bridge: New offline data is available 4 file size 90
[1765472832] <inf> data_bridge: Offline data sent successfully
[1765472833] <inf> data_bridge: New offline data is available 3 file size 180
[1765472834] <inf> data_bridge: Offline data sent successfully
"""

# I will read the actual file in the real run
log_path = '/Users/airship/Documents/demos/upload-estimation/data/data_upload_each_15_minutes.log'

def parse_log(path):
    with open(path, 'r') as f:
        lines = f.readlines()

    files = []
    
    current_file = None
    
    # Regex for start of upload: "New offline data is available <type> file size <size>"
    # Regex for end of upload: "Offline data sent successfully"
    # Capture timestamps
    
    start_pattern = re.compile(r'\[(\d+)\] <inf> data_bridge: New offline data is available (\d+) file size (\d+)')
    end_pattern = re.compile(r'\[(\d+)\] <inf> data_bridge: Offline data sent successfully')
    
    start_time = 0
    
    for line in lines:
        start_match = start_pattern.search(line)
        if start_match:
            timestamp = int(start_match.group(1))
            dtype = int(start_match.group(2))
            size = int(start_match.group(3))
            start_time = timestamp
            current_file = {'start': timestamp, 'type': dtype, 'size': size}
            
        end_match = end_pattern.search(line)
        if end_match and current_file:
            timestamp = int(end_match.group(1))
            current_file['end'] = timestamp
            current_file['duration'] = timestamp - current_file['start']
            files.append(current_file)
            current_file = None
            
    return files

parsed_files = parse_log(log_path)

total_files = len(parsed_files)
total_bytes = sum(f['size'] for f in parsed_files)
avg_size = total_bytes / total_files if total_files else 0
avg_duration = sum(f['duration'] for f in parsed_files) / total_files if total_files else 0

print(f"Total Files: {total_files}")
print(f"Total Bytes: {total_bytes}")
print(f"Average File Size: {avg_size:.2f} bytes")
print(f"Average Duration (Log Timestamp Delta): {avg_duration:.2f} s")

# Breakdown by type
by_type = {}
for f in parsed_files:
    t = f['type']
    if t not in by_type:
        by_type[t] = {'count': 0, 'bytes': 0, 'duration': 0}
    by_type[t]['count'] += 1
    by_type[t]['bytes'] += f['size']
    by_type[t]['duration'] += f['duration']

print("\nBreakdown by Type:")
for t, data in by_type.items():
    print(f"Type {t}: {data['count']} files, {data['bytes']} bytes, Avg Size: {data['bytes']/data['count']:.0f}, Avg Dur: {data['duration']/data['count']:.2f}s")
