CXX = g++
CXXFLAGS = -std=c++17 -O3 -Wall -Wextra -Isrc/cpp

TARGETS = nexora run_tests benchmark evaluate

all: $(TARGETS)

nexora: src/cpp/cli.cpp src/cpp/*.hpp
	$(CXX) $(CXXFLAGS) src/cpp/cli.cpp -o nexora

run_tests: tests/test_nexora.cpp src/cpp/*.hpp
	$(CXX) $(CXXFLAGS) tests/test_nexora.cpp -o run_tests

benchmark: benchmarks/benchmark.cpp src/cpp/*.hpp
	$(CXX) $(CXXFLAGS) benchmarks/benchmark.cpp -o benchmark

evaluate: benchmarks/evaluate.cpp src/cpp/*.hpp
	$(CXX) $(CXXFLAGS) benchmarks/evaluate.cpp -o evaluate

test: run_tests
	./run_tests

demo: nexora
	./nexora demo

bench: benchmark
	./benchmark

eval: evaluate
	./evaluate 3

check: test demo bench eval

clean:
	rm -f $(TARGETS)
